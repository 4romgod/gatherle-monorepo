import { uploadAsync, FileSystemUploadType, type FileSystemUploadResult } from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ensurePickedAssetIsAvailableLocally, getPickedAssetExtension } from '@/lib/media/pickedAsset';

function getUploadHeaders(mimeType?: string): Record<string, string> | undefined {
  if (!mimeType) {
    return undefined;
  }

  return {
    'Content-Type': mimeType,
  };
}

function ensureSuccessfulUpload(result: FileSystemUploadResult): void {
  if (result.status >= 200 && result.status < 300) {
    return;
  }

  throw new Error(`Upload failed (${result.status}).`);
}

export async function uploadMomentAssetToSignedUrl(uploadUrl: string, asset: ImagePickerAsset): Promise<string> {
  try {
    const resolvedAsset = await ensurePickedAssetIsAvailableLocally(asset);
    const uploadResult = await uploadAsync(uploadUrl, resolvedAsset.uri, {
      headers: getUploadHeaders(resolvedAsset.mimeType),
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
    });

    ensureSuccessfulUpload(uploadResult);
    return resolvedAsset.extension;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown upload error.';
    throw new Error(`We could not upload this moment media. ${detail}`);
  }
}

export function getMomentAssetExtension(asset: ImagePickerAsset): string {
  return getPickedAssetExtension(asset);
}
