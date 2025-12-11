'use client';

import { useRouter } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { spaceGrotesk } from '@/components/theme/fonts';

export default function Logo() {
  const router = useRouter();

  return (
    <Box
      component="button"
      type="button"
      onClick={() => router.push('/')}
      aria-label="Ntlango home"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        px: 1,
        py: 0.5,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 12,
          backgroundColor: 'primary.main',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            color: '#0b1224',
            letterSpacing: '-0.04em',
            fontFamily: spaceGrotesk.style.fontFamily,
          }}
        >
          NTL
        </Typography>
      </Box>
      <Typography
        variant="h5"
        noWrap
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.04em',
          fontFamily: spaceGrotesk.style.fontFamily,
          color: 'text.primary',
        }}
      >
        ntlango
      </Typography>
    </Box>
  );
}
