import { PaletteMode, ThemeOptions } from '@mui/material';
import { plusJakarta, spaceGrotesk } from '@/components/theme/fonts';
import darkModeColors from '@/components/theme/colors/dark-mode';
import lightModeColors from '@/components/theme/colors/light-mode';

/**
 * Color Scheme: https://m2.material.io/design/color/the-color-system.html#tools-for-picking-colors
 */
export const getDesignTokens = (mode: PaletteMode): ThemeOptions => ({
  typography: {
    fontFamily: plusJakarta.style.fontFamily,
    fontSize: 13,
    h1: {
      fontFamily: spaceGrotesk.style.fontFamily,
      fontWeight: 700,
      letterSpacing: '-0.04em',
    },
    h2: {
      fontFamily: spaceGrotesk.style.fontFamily,
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontFamily: spaceGrotesk.style.fontFamily,
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    button: {
      fontWeight: 600,
      letterSpacing: 0.4,
      textTransform: 'none',
    },
    subtitle1: {
      fontWeight: 600,
    },
  },
  palette: {
    mode,
    ...(mode === 'light' ? lightModeColors : darkModeColors),
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        ...(mode === 'light'
          ? {
              colorPrimary: {
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 12px 32px rgba(16, 24, 40, 0.06)',
              },
            }
          : {
              colorPrimary: {
                background: 'rgba(12, 18, 35, 0.9)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
              },
            }),
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 14,
          paddingBlock: 9,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
        },
      },
    },
  },
});
