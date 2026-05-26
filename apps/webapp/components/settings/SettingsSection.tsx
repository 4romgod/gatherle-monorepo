'use client';

import { ReactNode } from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import { BUTTON_STYLES } from '@/lib/constants';

type SettingsSectionProps = {
  children: ReactNode;
  description?: string;
  title: string;
  tone?: 'default' | 'danger';
};

export const SETTINGS_PRIMARY_BUTTON_SX: SxProps<Theme> = {
  ...BUTTON_STYLES,
  borderRadius: 999,
  fontWeight: 700,
  minHeight: 50,
  px: 3,
};

export const SETTINGS_SECONDARY_BUTTON_SX: SxProps<Theme> = {
  ...SETTINGS_PRIMARY_BUTTON_SX,
  bgcolor: 'background.paper',
  borderColor: 'divider',
};

export const SETTINGS_CHOICE_BUTTON_SX: SxProps<Theme> = {
  borderRadius: 999,
  fontSize: '0.95rem',
  fontWeight: 700,
  minHeight: 40,
  px: 2,
  textTransform: 'none',
};

export function SettingsSection({ children, description, title, tone = 'default' }: SettingsSectionProps) {
  const titleColor = tone === 'danger' ? 'error.main' : 'text.primary';
  const descriptionColor = tone === 'danger' ? 'error.main' : 'text.secondary';

  return (
    <Stack spacing={2.25}>
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Typography
          variant="h6"
          sx={{
            color: titleColor,
            fontSize: '1.0625rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography color={descriptionColor} sx={{ lineHeight: 1.6 }} variant="body2">
            {description}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ display: 'grid', gap: 2 }}>{children}</Box>
    </Stack>
  );
}
