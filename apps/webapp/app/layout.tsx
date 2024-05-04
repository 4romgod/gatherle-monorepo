'use client';

import '@/components/global.css';
import { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { createTheme } from '@mui/material/styles';
import { Box, CssBaseline, PaletteMode, ThemeProvider } from '@mui/material';
import { getDesignTokens } from '@/components/theme/design-tokens';
import Footer from '@/components/footer';
import PrimaryNavBar from '@/components/navigation/navbar';

export type CustomRootLayoutProps = {
  children: ReactNode;
  params?: {
    isAuthN?: boolean;
    themeMode?: PaletteMode;
    setThemeMode?: Dispatch<SetStateAction<PaletteMode>>;
    test?: string;
  };
};

export default function RootLayout({ children }: CustomRootLayoutProps) {
  const [themeMode, setThemeMode] = useState<PaletteMode>('light');
  const theme = useMemo(() => createTheme(getDesignTokens(themeMode)), [themeMode]);
  const isAuthN = true;

  return (
    <html lang="en">
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <body>
            <PrimaryNavBar themeMode={themeMode} setThemeMode={setThemeMode} isAuthN={isAuthN} />
            <Box component="div" marginTop={15}>
              {children}
            </Box>
            <Footer setThemeMode={setThemeMode} themeMode={themeMode} />
          </body>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </html>
  );
}
