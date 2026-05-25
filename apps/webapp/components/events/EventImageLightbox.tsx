'use client';

import { Box, Dialog, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

type EventImageLightboxProps = {
  alt: string;
  onClose: () => void;
  open: boolean;
  src?: string | null;
};

export default function EventImageLightbox({ alt, onClose, open, src }: EventImageLightboxProps) {
  return (
    <Dialog
      fullScreen
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          backgroundColor: 'common.black',
          backgroundImage: 'none',
        },
      }}
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          p: { xs: 2, md: 4 },
          position: 'relative',
          width: '100%',
        }}
      >
        <IconButton
          aria-label="Close image viewer"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: { xs: 12, md: 24 },
            top: { xs: 12, md: 24 },
            zIndex: 2,
            color: 'common.white',
            bgcolor: 'rgba(15, 23, 42, 0.72)',
            border: '1px solid',
            borderColor: 'rgba(255,255,255,0.16)',
            '&:hover': {
              bgcolor: 'rgba(15, 23, 42, 0.88)',
            },
          }}
        >
          <Close />
        </IconButton>

        {src ? (
          <Box
            alt={alt}
            component="img"
            src={src}
            sx={{
              display: 'block',
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
          />
        ) : null}
      </Box>
    </Dialog>
  );
}
