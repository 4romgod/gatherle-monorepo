'use client';

import { alpha, Box, BoxProps, useTheme } from '@mui/material';
import { ReactNode } from 'react';

interface SurfaceProps extends BoxProps {
  children: ReactNode;
  disableShadow?: boolean;
}

export default function Surface({ children, disableShadow = false, sx, ...rest }: SurfaceProps) {
  const theme = useTheme();

  const surfacePalette = theme.palette.surface;
  const borderColor = surfacePalette?.border ?? theme.palette.divider;
  const shadowValue =
    surfacePalette?.shadow ??
    (theme.palette.mode === 'light'
      ? `0 18px 50px ${alpha(theme.palette.common.black, 0.08)}`
      : `0 24px 60px ${alpha(theme.palette.common.black, 0.55)}`);

  const baseSurfaceSx = (themeArg: typeof theme) => ({
    borderRadius: themeArg.shape.borderRadius,
    backgroundColor: themeArg.palette.background.paper,
    border: `1px solid ${borderColor}`,
    boxShadow: disableShadow ? undefined : shadowValue,
  });

  const normalizedSx = Array.isArray(sx) ? sx : sx ? [sx] : [];
  const composedSx = [baseSurfaceSx, ...normalizedSx];

  return (
    <Box {...rest} sx={composedSx}>
      {children}
    </Box>
  );
}
