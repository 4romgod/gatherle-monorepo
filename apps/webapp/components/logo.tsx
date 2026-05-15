'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Box } from '@mui/material';
import { ROUTES, APP_LOGO_PATH, APP_NAME } from '@/lib/constants';
import { useIsAuthenticated } from '@/hooks/useIsAuthenticated';

export default function Logo() {
  const isAuth = useIsAuthenticated();
  return (
    <Box
      component={Link}
      href={isAuth ? ROUTES.HOME : ROUTES.ROOT}
      aria-label={`${APP_NAME} home`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        textDecoration: 'none',
        px: 1,
        py: 0.5,
      }}
    >
      <Box sx={{ width: 36, height: 36, position: 'relative' }}>
        <Image alt={APP_NAME} fill priority sizes="36px" src={APP_LOGO_PATH} />
      </Box>
    </Box>
  );
}
