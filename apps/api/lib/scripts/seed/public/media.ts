import { CONTENT_TYPE_MAP, MEDIA_CDN_DOMAIN, MEDIA_ENTITY_FOLDER, STAGE } from '@/constants';
import { getS3ObjectSize, uploadToS3 } from '@/clients/AWS/s3Client';
import { buildMediaCdnUrl } from '@/utils/mediaUrl';
import { logger } from '@/utils/logger';
import { MediaEntityType, MediaType } from '@gatherle/commons/types';

const MAX_IMPORTED_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const IMAGE_CONTENT_TYPE_TO_EXTENSION: Record<string, string> = Object.entries(CONTENT_TYPE_MAP).reduce<
  Record<string, string>
>((acc, [extension, contentType]) => {
  if (contentType.startsWith('image/') && !acc[contentType]) {
    acc[contentType] = extension;
  }

  return acc;
}, {});

function sanitizeKeySegment(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'unknown';
}

export function sanitizeImportedMediaKeySegment(value: string): string {
  return sanitizeKeySegment(value);
}

function buildImportedEventEntityId(sourcePlatform: string, externalId: string): string {
  return `imported-${sanitizeKeySegment(sourcePlatform)}-${sanitizeKeySegment(externalId)}`;
}

function buildImportedOrganizationEntityId(organizationKey: string): string {
  return `imported-${sanitizeKeySegment(organizationKey)}`;
}

function readExtensionFromUrl(sourceUrl: string): string | null {
  try {
    const parsed = new URL(sourceUrl);
    const match = parsed.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    if (!match) {
      return null;
    }

    const extension = match[1].replace(/^\./, '');
    return CONTENT_TYPE_MAP[extension]?.startsWith('image/') ? extension : null;
  } catch {
    return null;
  }
}

export function resolveImportedImageExtension(sourceUrl: string, contentType?: string | null): string | null {
  const normalizedContentType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (normalizedContentType && IMAGE_CONTENT_TYPE_TO_EXTENSION[normalizedContentType]) {
    return IMAGE_CONTENT_TYPE_TO_EXTENSION[normalizedContentType];
  }

  return readExtensionFromUrl(sourceUrl);
}

export function buildImportedEventFeaturedImageKey(params: {
  sourcePlatform: string;
  externalId: string;
  sourceUrl: string;
  contentType?: string | null;
}): string | null {
  const extension = resolveImportedImageExtension(params.sourceUrl, params.contentType);
  if (!extension) {
    return null;
  }

  const stagePrefix = STAGE.toLowerCase();
  const entityFolder = MEDIA_ENTITY_FOLDER[MediaEntityType.EventSeries];
  const entityId = buildImportedEventEntityId(params.sourcePlatform, params.externalId);

  return `${stagePrefix}/${entityFolder}/${entityId}/${MediaType.Featured}.${extension}`;
}

export function buildImportedOrganizationLogoKey(params: {
  organizationKey: string;
  sourceUrl: string;
  contentType?: string | null;
}): string | null {
  const extension = resolveImportedImageExtension(params.sourceUrl, params.contentType);
  if (!extension) {
    return null;
  }

  const stagePrefix = STAGE.toLowerCase();
  const entityFolder = MEDIA_ENTITY_FOLDER[MediaEntityType.Organization];
  const entityId = buildImportedOrganizationEntityId(params.organizationKey);

  return `${stagePrefix}/${entityFolder}/${entityId}/${MediaType.Logo}.${extension}`;
}

export async function mirrorImportedEventFeaturedImage(params: {
  sourcePlatform: string;
  externalId: string;
  imageUrl?: string;
}): Promise<string | undefined> {
  return mirrorImportedImage({
    imageUrl: params.imageUrl,
    buildKey: ({ sourceUrl, contentType }) =>
      buildImportedEventFeaturedImageKey({
        sourcePlatform: params.sourcePlatform,
        externalId: params.externalId,
        sourceUrl,
        contentType,
      }),
    logContext: {
      sourcePlatform: params.sourcePlatform,
      externalId: params.externalId,
    },
  });
}

export async function mirrorImportedOrganizationLogo(params: {
  organizationKey: string;
  imageUrl?: string;
}): Promise<string | undefined> {
  return mirrorImportedImage({
    imageUrl: params.imageUrl,
    buildKey: ({ sourceUrl, contentType }) =>
      buildImportedOrganizationLogoKey({
        organizationKey: params.organizationKey,
        sourceUrl,
        contentType,
      }),
    logContext: {
      organizationKey: params.organizationKey,
    },
  });
}

async function mirrorImportedImage(params: {
  imageUrl?: string;
  buildKey: (args: { sourceUrl: string; contentType?: string | null }) => string | null;
  logContext: Record<string, string>;
}): Promise<string | undefined> {
  const sourceUrl = params.imageUrl?.trim();
  if (!sourceUrl) {
    return undefined;
  }

  if (!MEDIA_CDN_DOMAIN) {
    logger.warn('Skipping imported media mirroring because MEDIA_CDN_DOMAIN is not configured; omitting media', {
      ...params.logContext,
      sourceUrl,
    });
    return undefined;
  }

  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch (error) {
    logger.warn('Failed to fetch imported media; omitting media', {
      error,
      ...params.logContext,
      sourceUrl,
    });
    return undefined;
  }

  if (!response.ok) {
    logger.warn('Imported media responded with a non-success status; omitting media', {
      ...params.logContext,
      sourceUrl,
      status: response.status,
    });
    return undefined;
  }

  const contentType = response.headers.get('content-type');
  const key = params.buildKey({ sourceUrl, contentType });

  if (!key) {
    logger.warn('Imported media type is unsupported; omitting media', {
      ...params.logContext,
      sourceUrl,
      contentType,
    });
    return undefined;
  }

  try {
    const existingSize = await getS3ObjectSize(key, { suppressNotFoundLog: true });
    if ((existingSize ?? 0) > 0) {
      return buildMediaCdnUrl(MEDIA_CDN_DOMAIN, key);
    }
  } catch {
    // Treat missing/unreadable metadata as a cache miss and attempt an upload.
  }

  const contentLengthHeader = response.headers.get('content-length');
  const declaredSize = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(declaredSize) && declaredSize > MAX_IMPORTED_IMAGE_SIZE_BYTES) {
    logger.warn('Imported media exceeds the seed mirroring size limit; omitting media', {
      ...params.logContext,
      sourceUrl,
      declaredSize,
      maxSize: MAX_IMPORTED_IMAGE_SIZE_BYTES,
    });
    return undefined;
  }

  try {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMPORTED_IMAGE_SIZE_BYTES) {
      logger.warn('Imported media exceeds the seed mirroring size limit after download; omitting media', {
        ...params.logContext,
        sourceUrl,
        size: buffer.byteLength,
        maxSize: MAX_IMPORTED_IMAGE_SIZE_BYTES,
      });
      return undefined;
    }

    await uploadToS3(key, buffer, contentType?.split(';', 1)[0]?.trim().toLowerCase() || 'image/jpeg');
    return buildMediaCdnUrl(MEDIA_CDN_DOMAIN, key);
  } catch (error) {
    logger.warn('Failed to mirror imported media to S3; omitting media', {
      error,
      ...params.logContext,
      sourceUrl,
      key,
    });
    return undefined;
  }
}
