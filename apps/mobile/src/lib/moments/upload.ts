import { uploadAsync, FileSystemUploadType, type FileSystemUploadResult } from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';

function getExtensionFromAsset(asset: ImagePickerAsset): string {
  const fileName = asset.fileName?.trim();
  if (fileName?.includes('.')) {
    return fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  }

  if (asset.mimeType?.includes('/')) {
    const subtype = asset.mimeType.split('/')[1]?.toLowerCase();
    if (subtype) {
      return subtype === 'jpeg' ? 'jpg' : subtype;
    }
  }

  return 'jpg';
}

function getUploadHeaders(asset: ImagePickerAsset): Record<string, string> | undefined {
  if (!asset.mimeType) {
    return undefined;
  }

  return {
    'Content-Type': asset.mimeType,
  };
}

function ensureSuccessfulUpload(result: FileSystemUploadResult): void {
  if (result.status >= 200 && result.status < 300) {
    return;
  }

  throw new Error(`Upload failed (${result.status}).`);
}

export async function uploadMomentAssetToSignedUrl(uploadUrl: string, asset: ImagePickerAsset): Promise<string> {
  if (!asset.uri) {
    throw new Error('Selected media is missing a file URI.');
  }

  try {
    const uploadResult = await uploadAsync(uploadUrl, asset.uri, {
      headers: getUploadHeaders(asset),
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
    });

    ensureSuccessfulUpload(uploadResult);
    return getExtensionFromAsset(asset);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown upload error.';
    throw new Error(`We could not upload this moment media. ${detail}`);
  }
}

export function getMomentAssetExtension(asset: ImagePickerAsset): string {
  return getExtensionFromAsset(asset);
}
