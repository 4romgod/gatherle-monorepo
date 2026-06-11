import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  mov: 'video/quicktime',
  mp4: 'video/mp4',
  png: 'image/png',
  webm: 'video/webm',
  webp: 'image/webp',
};

const EXTENSION_ALIAS: Record<string, string> = {
  'image/jpg': 'jpg',
  jpeg: 'jpg',
  jpg: 'jpg',
  quicktime: 'mov',
  'x-quicktime': 'mov',
};

export type UploadablePickedAsset = {
  extension: string;
  fileSize?: number;
  mimeType?: string;
  uri: string;
};

function normalizeExtensionToken(value: string): string {
  const normalizedValue = value.trim().toLowerCase();
  return EXTENSION_ALIAS[normalizedValue] ?? normalizedValue;
}

function getExtensionFromPathSegment(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const withoutQuery = value.split('?')[0]?.split('#')[0];
  const fileSegment = withoutQuery?.split('/').pop();
  if (!fileSegment || !fileSegment.includes('.')) {
    return undefined;
  }

  const extension = fileSegment.split('.').pop();
  return extension ? normalizeExtensionToken(extension) : undefined;
}

function getExtensionFromMimeType(mimeType?: string | null): string | undefined {
  if (!mimeType?.includes('/')) {
    return undefined;
  }

  const normalizedMimeType = mimeType.split(';', 1)[0]?.trim().toLowerCase();
  const subtype = normalizedMimeType?.split('/')[1];
  return subtype ? normalizeExtensionToken(subtype) : undefined;
}

function normalizeMimeType(mimeType?: string | null): string | undefined {
  if (!mimeType) {
    return undefined;
  }

  const normalizedMimeType = mimeType.split(';', 1)[0]?.trim().toLowerCase();
  return normalizedMimeType || undefined;
}

export function getPickedAssetExtension(asset: ImagePickerAsset): string {
  return (
    getExtensionFromPathSegment(asset.uri) ??
    getExtensionFromMimeType(asset.mimeType) ??
    getExtensionFromPathSegment(asset.fileName) ??
    'jpg'
  );
}

export function getPickedAssetMimeType(asset: ImagePickerAsset): string | undefined {
  const extension = getPickedAssetExtension(asset);
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? normalizeMimeType(asset.mimeType);
}

export async function ensurePickedAssetIsAvailableLocally(asset: ImagePickerAsset): Promise<UploadablePickedAsset> {
  if (!asset.uri) {
    throw new Error('Selected media is missing a file URI.');
  }

  const file = new File(asset.uri);
  if (!file.exists) {
    throw new Error(
      'Selected media is not available on this device yet. Please wait for the download to finish and try again.',
    );
  }

  return {
    extension: getPickedAssetExtension(asset),
    fileSize: asset.fileSize ?? file.size ?? undefined,
    mimeType: getPickedAssetMimeType(asset),
    uri: asset.uri,
  };
}
