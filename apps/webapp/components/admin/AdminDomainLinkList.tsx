'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { ADMIN_SURFACE_SX } from '@/components/admin/admin-ui';

export type AdminDomainLink = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ReactElement;
};

type AdminDomainLinkListProps = {
  links: AdminDomainLink[];
};

export function AdminDomainLinkList({ links }: AdminDomainLinkListProps) {
  return (
    <Stack spacing={1.25} component="nav" aria-label="Admin domains">
      {links.map((link) => (
        <Box
          key={link.id}
          component={Link}
          href={link.href}
          sx={{
            ...ADMIN_SURFACE_SX,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: { xs: 1.75, md: 2 },
            textDecoration: 'none',
            color: 'inherit',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.04),
              borderColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.22),
            },
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.1),
              color: (theme) =>
                theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
            }}
          >
            {link.icon}
          </Box>
          <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {link.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {link.description}
            </Typography>
          </Stack>
          <ChevronRightRoundedIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
        </Box>
      ))}
    </Stack>
  );
}
