'use client';

import { Button, PaletteMode } from '@mui/material';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { Dispatch, SetStateAction } from 'react';

export type ToggleThemeModeProps = {
  setThemeMode: Dispatch<SetStateAction<PaletteMode>>;
  themeMode: PaletteMode;
};

export default function ToggleThemeMode({
  setThemeMode,
  themeMode,
}: ToggleThemeModeProps) {
  const isDarkTheme = themeMode === 'dark';

  return (
    <Button onClick={() => setThemeMode(isDarkTheme ? 'light' : 'dark')}>
      {isDarkTheme ? (
        <SunIcon color="primary" className="h-6 w-6" />
      ) : (
        <MoonIcon color="primary" className="h-6 w-6" />
      )}
    </Button>
  );
}
