'use client';

import { useState, useMemo } from 'react';
import { ThemeOptions, createTheme } from '@mui/material/styles';
import { Box, CssBaseline, PaletteMode, ThemeProvider } from '@mui/material';
import { inter } from '@/components/theme/fonts';
import { indigo as primaryColor } from '@mui/material/colors';
import Navbar from '@/components/navigation/navbar';
import Footer from '@/components/footer';

/**
 * Color Scheme: https://m2.material.io/design/color/the-color-system.html#tools-for-picking-colors
 */
const getDesignTokens = (mode: PaletteMode): ThemeOptions => ({
  typography: {
    fontFamily: inter.style.fontFamily,
    fontSize: 14,
  },
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: {
            light: primaryColor[300],
            main: primaryColor[500],
            dark: primaryColor[700],
          },
          secondary: {
            light: '#ebe252',
            main: '#c9ba45',
            dark: '#947e35',
          },
          error: {
            main: '#f44336',
          },
          background: {
            default: '#FFFFFF',
            paper: '#f6f7fe',
          },
          text: {
            primary: '#121318',
            secondary: '#666666',
          },
        }
      : {
          primary: {
            light: primaryColor[300],
            main: primaryColor[500],
            dark: primaryColor[700],
          },
          secondary: {
            light: '#ebe252',
            main: '#c9ba45',
            dark: '#947e35',
          },
          error: {
            main: '#f44336',
          },
          background: {
            default: '#121318',
            paper: '#323338',
          },
          text: {
            primary: '#FFFFFF',
            secondary: '#CCCCCC',
          },
        }),
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        ...(mode === 'light'
          ? {
              colorPrimary: {
                background: '#FFFFFF',
              },
            }
          : {
              colorPrimary: {
                background: '#121318',
              },
            }),
      },
    },
  },
});

export default function CustomThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeMode, setThemeMode] = useState<PaletteMode>('light');
  const theme = useMemo(
    () => createTheme(getDesignTokens(themeMode)),
    [themeMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <body>
        <Navbar setThemeMode={setThemeMode} themeMode={themeMode} />
        <Box
          component="div"
          id="main-content"
          position={'relative'}
          marginTop={10}
        >
          {children}
        </Box>
        <Footer setThemeMode={setThemeMode} themeMode={themeMode} />
      </body>
    </ThemeProvider>
  );
}
