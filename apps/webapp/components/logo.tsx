'use client';

import Link from 'next/link';
import { alpha, Box, Typography } from '@mui/material';
import { spaceGrotesk } from '@/components/theme/fonts';
import { ROUTES } from '@/lib/constants';
import { useIsAuthenticated } from '@/hooks/useIsAuthenticated';

export default function Logo() {
  const isAuth = useIsAuthenticated();
  return (
    <Box
      component={Link}
      href={isAuth ? ROUTES.HOME : ROUTES.ROOT}
      aria-label="Gatherle home"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        textDecoration: 'none',
        px: 1,
        py: 0.5,
      }}
    >
      <Box
        sx={(theme) => ({
          width: 32,
          height: 32,
          borderRadius: 12,
          backgroundColor: 'primary.main',
          display: 'grid',
          placeItems: 'center',
          boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.08)}`,
        })}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            color: 'primary.contrastText',
            letterSpacing: '-0.04em',
            fontFamily: spaceGrotesk.style.fontFamily,
          }}
        >
          NTL
        </Typography>
      </Box>
    </Box>
  );
}
