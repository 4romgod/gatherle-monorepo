import type { ImagePickerAsset } from 'expo-image-picker';

function getExtensionFromAsset(asset: ImagePickerAsset): string {
  const fileName = asset.fileName?.trim();
  if (fileName?.includes('.')) {
    return fileName.split('.').pop()!.toLowerCase();
  }

  if (asset.mimeType?.includes('/')) {
    const subtype = asset.mimeType.split('/')[1]?.toLowerCase();
    if (subtype) {
      return subtype === 'jpeg' ? 'jpg' : subtype;
    }
  }

  return 'jpg';
}

async function createBlobFromAsset(asset: ImagePickerAsset): Promise<Blob> {
  const response = await fetch(asset.uri);
  return response.blob();
}

export async function uploadMomentAssetToSignedUrl(uploadUrl: string, asset: ImagePickerAsset): Promise<string> {
  const fileBlob = await createBlobFromAsset(asset);
  const uploadResponse = await fetch(uploadUrl, {
    body: fileBlob,
    headers: asset.mimeType ? { 'Content-Type': asset.mimeType } : undefined,
    method: 'PUT',
  });

  if (!uploadResponse.ok) {
    throw new Error('We could not upload this moment media.');
  }

  return getExtensionFromAsset(asset);
}

export function getMomentAssetExtension(asset: ImagePickerAsset): string {
  return getExtensionFromAsset(asset);
}
