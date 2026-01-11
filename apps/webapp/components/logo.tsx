'use client';

import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { spaceGrotesk } from '@/components/theme/fonts';

export default function Logo() {
  return (
    <Box
      component={Link}
      href="/"
      aria-label="Ntlango home"
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
    </Box>
  );
}
