'use client';

import '@/components/global.css';
import { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { useState, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import { Box, CssBaseline, PaletteMode, ThemeProvider } from '@mui/material';
import { getDesignTokens } from '@/components/theme/design-tokens';
import Footer from '@/components/footer';
import MainNavigation from '@/components/navigation/main';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<PaletteMode>('light');
  const theme = useMemo(() => createTheme(getDesignTokens(themeMode)), [themeMode]);
  const [isAuthN, setIsAuthN] = useState<boolean>(false);

  return (
    <html lang="en">
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <body>
            <MainNavigation
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              isAuthN={isAuthN}
              setIsAuthN={setIsAuthN}
            />
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
