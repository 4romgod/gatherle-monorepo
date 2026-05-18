import { uploadAsync, FileSystemUploadType, type FileSystemUploadResult } from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';

function getExtensionFromAsset(asset: ImagePickerAsset): string {
  const fileName = asset.fileName?.trim();
  if (fileName?.includes('.')) {
    const extension = fileName.split('.').pop()?.trim().toLowerCase();
    return extension || 'jpg';
  }

  if (asset.mimeType?.includes('/')) {
    const subtype = asset.mimeType.split('/')[1]?.toLowerCase();
    if (subtype === 'jpeg') return 'jpg';
    if (subtype) return subtype;
  }

  return 'jpg';
}

function ensureSuccessfulUpload(result: FileSystemUploadResult): void {
  if (result.status >= 200 && result.status < 300) {
    return;
  }
  throw new Error(`Upload failed (${result.status}).`);
}

/**
 * Upload an image asset to a pre-signed S3 URL.
 * Returns the resolved file extension on success.
 */
export async function uploadImageAssetToSignedUrl(uploadUrl: string, asset: ImagePickerAsset): Promise<string> {
  if (!asset.uri) {
    throw new Error('Selected image is missing a file URI.');
  }

  const headers: Record<string, string> = {};
  if (asset.mimeType) {
    headers['Content-Type'] = asset.mimeType;
  }

  try {
    const result = await uploadAsync(uploadUrl, asset.uri, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
    });

    ensureSuccessfulUpload(result);
    return getExtensionFromAsset(asset);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown upload error.';
    throw new Error(`We could not upload this image. ${detail}`);
  }
}

export function getImageAssetExtension(asset: ImagePickerAsset): string {
  return getExtensionFromAsset(asset);
}
