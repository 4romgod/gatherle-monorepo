import 'reflect-metadata';
import { Arg, Query, Authorized, Ctx, Resolver } from 'type-graphql';
import { ImageUploadUrl, ImageEntityType, ImageType, UserRole } from '@gatherle/commons/types';
import { getAuthenticatedUser } from '@/utils';
import { getPresignedUploadUrl } from '@/clients/AWS/s3Client';
import { CF_IMAGES_DOMAIN, CONTENT_TYPE_MAP, STAGE } from '@/constants';
import { logger } from '@/utils/logger';
import type { ServerContext } from '@/graphql';
import { randomUUID, randomBytes } from 'crypto';

@Resolver()
export class ImageResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => ImageUploadUrl, { description: 'Get pre-signed URL for uploading images directly to S3' })
  async getImageUploadUrl(
    @Arg('entityType', () => ImageEntityType, { description: 'Type of entity this image belongs to' })
    entityType: ImageEntityType,
    @Arg('imageType', () => ImageType, { description: 'Purpose of the image (avatar, logo, featured, gallery)' })
    imageType: ImageType,
    @Arg('extension', () => String, { description: 'File extension without leading dot (e.g. jpg, png, webp)' })
    extension: string,
    @Arg('entityId', () => String, {
      nullable: true,
      description: 'ID of the entity. Required for Organization, Event, Venue. Auto-resolved from auth for User.',
    })
    entityId: string | null,
    @Ctx() context: ServerContext,
  ): Promise<ImageUploadUrl> {
    const user = getAuthenticatedUser(context);

    // For User images, always derive the entity ID from the authenticated user — never trust the client.
    // For other entity types, fall back to a random UUID if no entityId is provided (e.g. during entity creation
    // before an ID has been assigned). This keeps the key non-colliding even without a real entity ID.
    const resolvedEntityId = entityType === ImageEntityType.User ? user.userId : (entityId ?? randomUUID());

    const cleanExt = extension.toLowerCase().replace(/^\./, '');
    const contentType = CONTENT_TYPE_MAP[cleanExt] || 'image/jpeg';

    // Key structure varies by entity type.
    // EventMoment: {stage}/event-moments/{eventSlug}/{username}/{shortId}.{ext}
    //   - Event slug (passed as entityId) makes S3 paths human-readable.
    //   - Username folder gives per-author observability without polluting the filename.
    //   - Short random ID (11 URL-safe chars, 64-bit entropy) keeps paths concise while
    //     remaining collision-proof within a single event+author folder.
    //   - Tidy multi-rendition HLS paths: {shortId}/hls/{shortId}_720p.m3u8
    // Other types: {stage}/{entityType}s/{entityId}/{filename}
    //   - Gallery/unique types include UUID in filename; avatar/logo/featured are deterministic.
    const stagePrefix = STAGE.toLowerCase();
    let key: string;

    if (entityType === ImageEntityType.EventMoment) {
      const sanitizedSlug = resolvedEntityId
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const sanitizedUsername = user.username
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const shortId = randomBytes(8).toString('base64url');
      key = `${stagePrefix}/event-moments/${sanitizedSlug}/${sanitizedUsername}/${shortId}.${cleanExt}`;
    } else {
      const entityFolder = `${entityType}s`;
      const needsUniqueKey = imageType === ImageType.Gallery;
      const filename = needsUniqueKey ? `${imageType}-${randomUUID()}.${cleanExt}` : `${imageType}.${cleanExt}`;
      key = `${stagePrefix}/${entityFolder}/${resolvedEntityId}/${filename}`;
    }

    if (!CF_IMAGES_DOMAIN) {
      throw new Error('CF_IMAGES_DOMAIN is required to generate stable media URLs');
    }

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900); // 15 minutes
    const readUrl = `https://${CF_IMAGES_DOMAIN}/${key}`;

    logger.info('Generated image upload URL', {
      userId: user.userId,
      entityType,
      entityId: resolvedEntityId,
      imageType,
      key,
      mediaHost: CF_IMAGES_DOMAIN,
    });

    return { uploadUrl, key, readUrl };
  }
}
