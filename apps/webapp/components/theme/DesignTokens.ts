import { alpha, PaletteMode, ThemeOptions } from '@mui/material';
import { plusJakarta, spaceGrotesk } from '@/components/theme/fonts';
import darkModeColors from '@/components/theme/colors/DarkMode';
import lightModeColors from '@/components/theme/colors/LightMode';

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
    MuiInputBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-disabled': {
            opacity: 1,
            color: theme.palette.text.primary,
            WebkitTextFillColor: theme.palette.text.primary,
            backgroundColor: theme.palette.action.disabledBackground,
          },
          '& .MuiInputBase-input::placeholder, & .MuiInputBase-input:-webkit-autofill': {
            color: theme.palette.text.secondary,
          },
          '&.Mui-disabled .MuiInputBase-input': {
            color: theme.palette.grey[500],
            WebkitTextFillColor: theme.palette.grey[500],
          },
          '& .MuiInputBase-input': {
            color: theme.palette.text.primary,
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
            borderStyle: 'solid',
            borderWidth: 1,
          },
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-disabled': {
            color: theme.palette.text.secondary,
          },
        }),
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: ({ theme }) => {
          const baseLight = alpha(theme.palette.text.primary, 0.3);
          const waveLight = alpha(theme.palette.text.primary, 0.3);
          const baseDark = alpha(theme.palette.common.white, 0.3);
          const waveDark = alpha(theme.palette.common.white, 0.3);

          const background = theme.palette.mode === 'light' ? baseLight : baseDark;
          const wave = theme.palette.mode === 'light' ? waveLight : waveDark;

          return {
            backgroundColor: background,
            borderRadius: 2,
            '&::before': {
              backgroundImage: `linear-gradient(90deg, transparent, ${wave}, transparent)`,
            },
          };
        },
      },
    },
  },
});
