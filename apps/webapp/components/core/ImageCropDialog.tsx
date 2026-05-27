'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import type { WebMediaCropPreset } from '@/lib/constants/media';
import { cropImageFile } from '@/lib/media/cropImage';

type ImageCropDialogProps = {
  file: File | null;
  open: boolean;
  preset: WebMediaCropPreset;
  onCancel: () => void;
  onConfirm: (result: { file: File; previewUrl: string }) => void | Promise<void>;
};

export function ImageCropDialog({ file, open, preset, onCancel, onConfirm }: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setError(null);
    setSubmitting(false);
    setZoom(1);
  }, [open, file?.name]);

  useEffect(() => {
    if (!file) {
      setSourceUrl(null);
      return;
    }

    const nextSourceUrl = URL.createObjectURL(file);
    setSourceUrl(nextSourceUrl);

    return () => {
      URL.revokeObjectURL(nextSourceUrl);
    };
  }, [file]);

  const handleConfirm = async () => {
    if (!file || !croppedAreaPixels) {
      setError('Please adjust the crop before continuing.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const croppedFile = await cropImageFile({
        file,
        pixelCrop: croppedAreaPixels,
        preset,
      });
      const previewUrl = URL.createObjectURL(croppedFile);
      await onConfirm({ file: croppedFile, previewUrl });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'We could not crop this image.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="md" onClose={submitting ? undefined : onCancel} open={open}>
      <DialogTitle>{preset.cropLabel}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography color="text.secondary" variant="body2">
            {preset.helperText}
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: 360,
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'common.black',
            }}
          >
            {sourceUrl ? (
              <Cropper
                aspect={preset.aspect}
                crop={crop}
                image={sourceUrl}
                objectFit="contain"
                onCropChange={setCrop}
                onCropComplete={(_, nextCroppedAreaPixels) => setCroppedAreaPixels(nextCroppedAreaPixels)}
                onZoomChange={setZoom}
                showGrid={false}
                zoom={zoom}
              />
            ) : null}
          </Box>

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography fontWeight={600} variant="body2">
                Zoom
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {preset.aspectLabel}
              </Typography>
            </Stack>
            <Slider max={3} min={1} onChange={(_, value) => setZoom(value as number)} step={0.01} value={zoom} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={submitting} onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!file || submitting} onClick={() => void handleConfirm()} variant="contained">
          {submitting ? 'Applying…' : 'Use crop'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
