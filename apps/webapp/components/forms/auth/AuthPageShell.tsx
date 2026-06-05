'use client';

import type { ReactNode } from 'react';
import { DarkMode, LightMode } from '@mui/icons-material';
import { Box, Container, IconButton, Paper, Typography } from '@mui/material';
import Logo from '@/components/logo';
import { useAppContext } from '@/hooks/useAppContext';
import { WEB_RADIUS } from '@/lib/constants/radius';

type AuthPageShellProps = {
  children: ReactNode;
  subtitle?: string;
  title?: string;
};

export default function AuthPageShell({ children, subtitle, title }: AuthPageShellProps) {
  const { themeMode, setThemeMode } = useAppContext();
  const themeLabel = themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Box sx={{ py: { xs: 4, sm: 6 }, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: WEB_RADIUS.card,
            p: { xs: 3, sm: 4 },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 40px',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Box aria-hidden="true" sx={{ width: 40 }} />
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Logo />
            </Box>
            <IconButton
              aria-label={themeLabel}
              onClick={() => setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark'))}
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.primary',
                height: 40,
                justifySelf: 'end',
                width: 40,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {themeMode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Box>

          {title ? (
            <Typography textAlign="center" component="h1" variant="h4" fontWeight={700} marginBottom={1}>
              {title}
            </Typography>
          ) : null}
          {subtitle ? (
            <Typography textAlign="center" variant="body2" color="text.secondary" marginBottom={4}>
              {subtitle}
            </Typography>
          ) : null}

          {children}
        </Paper>
      </Container>
    </Box>
  );
}
