'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageCropDialog } from '@/components/core/ImageCropDialog';
import type { WebMediaCropPreset } from '@/lib/constants/media';

export function useAspectRatioImageSelection({
  preset,
  onCropped,
}: {
  preset: WebMediaCropPreset;
  onCropped?: (result: { file: File; previewUrl: string }) => void | Promise<void>;
}) {
  const previewUrlRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingSourceFile, setPendingSourceFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  const selectFileForCrop = useCallback((file: File | null) => {
    if (!file) {
      return;
    }

    setPendingSourceFile(file);
    setOpen(true);
  }, []);

  const clearSelection = useCallback(() => {
    revokePreviewUrl();
    setPreviewUrl(null);
    setSelectedFile(null);
    setPendingSourceFile(null);
    setOpen(false);
  }, [revokePreviewUrl]);

  const handleConfirm = useCallback(
    async (result: { file: File; previewUrl: string }) => {
      revokePreviewUrl();
      previewUrlRef.current = result.previewUrl;
      setSelectedFile(result.file);
      setPreviewUrl(result.previewUrl);
      setPendingSourceFile(null);
      setOpen(false);

      if (onCropped) {
        await onCropped(result);
      }
    },
    [onCropped, revokePreviewUrl],
  );

  const cropDialog = (
    <ImageCropDialog
      file={pendingSourceFile}
      open={open}
      preset={preset}
      onCancel={() => {
        setOpen(false);
        setPendingSourceFile(null);
      }}
      onConfirm={handleConfirm}
    />
  );

  return {
    clearSelection,
    cropDialog,
    previewUrl,
    selectFileForCrop,
    selectedFile,
  };
}
