'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { SxProps, Theme } from '@mui/material/styles';

type RemoteImageProps = {
  alt: string;
  className?: string;
  fallback: ReactNode;
  imageSx?: SxProps<Theme>;
  loading?: 'eager' | 'lazy';
  showLoader?: boolean;
  src?: string | null;
  sx?: SxProps<Theme>;
};

export default function RemoteImage({
  alt,
  className,
  fallback,
  imageSx,
  loading = 'lazy',
  showLoader = false,
  src,
  sx,
}: RemoteImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (!src || failed) {
    return (
      <Box className={className} sx={[baseSx, ...(Array.isArray(sx) ? sx : [sx])]}>
        {fallback}
      </Box>
    );
  }

  return (
    <Box className={className} sx={[baseSx, ...(Array.isArray(sx) ? sx : [sx])]}>
      {loaded ? null : fallback}
      <Box
        alt={alt}
        component="img"
        loading={loading}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        src={src}
        sx={[
          {
            height: '100%',
            inset: 0,
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            position: 'absolute',
            transition: 'opacity 0.18s ease',
            width: '100%',
          },
          ...(Array.isArray(imageSx) ? imageSx : [imageSx]),
        ]}
      />
      {showLoader && !loaded ? (
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            inset: 0,
            justifyContent: 'center',
            position: 'absolute',
          }}
        >
          <CircularProgress color="inherit" size={20} />
        </Box>
      ) : null}
    </Box>
  );
}

const baseSx: SxProps<Theme> = {
  overflow: 'hidden',
  position: 'relative',
};
