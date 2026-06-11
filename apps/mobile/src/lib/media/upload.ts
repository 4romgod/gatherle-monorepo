import { uploadAsync, FileSystemUploadType, type FileSystemUploadResult } from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ensurePickedAssetIsAvailableLocally, getPickedAssetExtension } from '@/lib/media/pickedAsset';

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
  try {
    const resolvedAsset = await ensurePickedAssetIsAvailableLocally(asset);
    const headers: Record<string, string> = {};
    if (resolvedAsset.mimeType) {
      headers['Content-Type'] = resolvedAsset.mimeType;
    }

    const result = await uploadAsync(uploadUrl, resolvedAsset.uri, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
    });

    ensureSuccessfulUpload(result);
    return resolvedAsset.extension;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown upload error.';
    throw new Error(`We could not upload this image. ${detail}`);
  }
}

export function getImageAssetExtension(asset: ImagePickerAsset): string {
  return getPickedAssetExtension(asset);
}
