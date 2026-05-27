'use client';

import type { Area } from 'react-easy-crop';
import type { WebMediaCropPreset } from '@/lib/constants/media';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('We could not load this image for cropping.'));
    image.src = src;
  });
}

function replaceFileExtension(fileName: string, nextExtension: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${fileName}.${nextExtension}`;
  }

  return `${fileName.slice(0, lastDotIndex)}.${nextExtension}`;
}

function resolveOutputMimeType(fileType: string): string {
  if (fileType === 'image/png') {
    return 'image/png';
  }

  if (fileType === 'image/webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

export async function cropImageFile({
  file,
  pixelCrop,
  preset,
}: {
  file: File;
  pixelCrop: Area;
  preset: WebMediaCropPreset;
}): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = preset.outputWidth;
    canvas.height = preset.outputHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('We could not prepare this cropped image.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const mimeType = resolveOutputMimeType(file.type);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (!nextBlob) {
            reject(new Error('We could not export the cropped image.'));
            return;
          }

          resolve(nextBlob);
        },
        mimeType,
        0.92,
      );
    });

    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';

    return new File([blob], replaceFileExtension(file.name, extension), {
      lastModified: Date.now(),
      type: mimeType,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
