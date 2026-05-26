'use client';

import { Box, Button, Stack, Typography } from '@mui/material';
import { useAppContext } from '@/hooks/useAppContext';
import { SETTINGS_CHOICE_BUTTON_SX, SettingsSection } from './SettingsSection';

const THEME_OPTIONS = [
  {
    description: 'Bright surfaces and higher daytime contrast.',
    label: 'Light',
    value: 'light',
  },
  {
    description: 'Dimmed surfaces for low-light browsing.',
    label: 'Dark',
    value: 'dark',
  },
] as const;

export default function AppearanceSettingsPage() {
  const { themeMode, setThemeMode } = useAppContext();

  return (
    <Stack spacing={4}>
      <SettingsSection description="Match the web app to the way you want to browse right now." title="Appearance">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
          {THEME_OPTIONS.map((option) => {
            const selected = themeMode === option.value;

            return (
              <Button
                aria-pressed={selected}
                color={selected ? 'primary' : 'inherit'}
                key={option.value}
                onClick={() => setThemeMode(option.value)}
                sx={SETTINGS_CHOICE_BUTTON_SX}
                variant={selected ? 'contained' : 'outlined'}
              >
                {option.label}
              </Button>
            );
          })}
        </Stack>
      </SettingsSection>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 4,
          px: 2.25,
          py: 2,
        }}
      >
        <Typography color="text.secondary" variant="body2">
          Theme changes apply immediately on this device and stay tied to this browser session preference.
        </Typography>
      </Box>
    </Stack>
  );
}
