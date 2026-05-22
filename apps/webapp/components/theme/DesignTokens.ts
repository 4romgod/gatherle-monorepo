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
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        },
        '::selection': {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        },
        a: {
          color: theme.palette.primary.main,
        },
      }),
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: ({ theme }) => ({
          background: theme.palette.background.default,
          backdropFilter: 'none',
          boxShadow: 'none',
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.background.default,
          backgroundImage: 'none',
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
          backgroundColor: theme.palette.background.paper,
          transition: theme.transitions.create(['background-color', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
          '& .MuiInputBase-input:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
          '& textarea:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
          '&.Mui-disabled': {
            opacity: 1,
            color: theme.palette.text.primary,
            WebkitTextFillColor: theme.palette.text.primary,
            backgroundColor: theme.palette.action.disabledBackground,
          },
          '& .MuiInputBase-input::placeholder': {
            color: theme.palette.text.secondary,
          },
          '&.Mui-disabled .MuiInputBase-input': {
            color: theme.palette.grey[500],
            WebkitTextFillColor: theme.palette.grey[500],
          },
          '& .MuiInputBase-input': {
            color: theme.palette.text.primary,
          },
          '& .MuiInputBase-input:-webkit-autofill, & .MuiInputBase-input:-webkit-autofill:hover, & .MuiInputBase-input:-webkit-autofill:focus, & .MuiInputBase-input:-webkit-autofill:active':
            {
              WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset`,
              WebkitTextFillColor: theme.palette.text.primary,
              caretColor: theme.palette.text.primary,
              borderRadius: 'inherit',
              transition: 'background-color 9999s ease-out 0s',
            },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderRadius: 10,
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.03)
                : alpha(theme.palette.grey[900], 0.02),
          },
          '&.Mui-focused': {
            backgroundColor: theme.palette.background.paper,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.primary.main, 0.55),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: 1,
          },
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
          const baseLight = alpha(theme.palette.text.primary, 0.2);
          const waveLight = alpha(theme.palette.text.primary, 0.2);
          const baseDark = alpha(theme.palette.common.white, 0.2);
          const waveDark = alpha(theme.palette.common.white, 0.2);

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
