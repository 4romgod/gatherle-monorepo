'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

type SxEntry = boolean | SystemStyleObject<Theme> | ((theme: Theme) => SystemStyleObject<Theme>);
type SxArray = ReadonlyArray<SxEntry>;

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
  const containerSx = normalizeSx(sx);
  const imgSx = normalizeSx(imageSx);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (!src || failed) {
    return (
      <Box className={className} sx={[baseSx, ...containerSx]}>
        {fallback}
      </Box>
    );
  }

  return (
    <Box className={className} sx={[baseSx, ...containerSx]}>
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
          ...imgSx,
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

const baseSx: SxEntry = {
  overflow: 'hidden',
  position: 'relative',
};

function normalizeSx(sx: SxProps<Theme> | undefined): SxArray {
  if (!sx) {
    return [];
  }

  return isSxArray(sx) ? sx : [sx];
}

function isSxArray(sx: SxProps<Theme>): sx is SxArray {
  return Array.isArray(sx);
}
