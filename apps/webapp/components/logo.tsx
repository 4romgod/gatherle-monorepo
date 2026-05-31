'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Box, useTheme } from '@mui/material';
import { ROUTES, APP_LOGO_DARK_PATH, APP_LOGO_LIGHT_PATH, APP_NAME } from '@/lib/constants';
import { useIsAuthenticated } from '@/hooks/useIsAuthenticated';

export default function Logo() {
  const isAuth = useIsAuthenticated();
  const theme = useTheme();
  const logoPath = theme.palette.mode === 'dark' ? APP_LOGO_DARK_PATH : APP_LOGO_LIGHT_PATH;

  return (
    <Box
      component={Link}
      href={isAuth ? ROUTES.HOME : ROUTES.ROOT}
      aria-label={`${APP_NAME} home`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        textDecoration: 'none',
        px: { xs: 0.5, md: 1 },
        py: 0.5,
      }}
    >
      <Box sx={{ width: { xs: 32, md: 36 }, height: { xs: 32, md: 36 }, position: 'relative' }}>
        <Image alt={APP_NAME} fill priority sizes="36px" src={logoPath} />
      </Box>
    </Box>
  );
}
