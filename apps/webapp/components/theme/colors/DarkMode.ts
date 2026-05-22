import { PaletteOptions } from '@mui/material';

declare module '@mui/material/styles' {
  interface Palette {
    hero: {
      background: string;
      text: string;
      textSecondary: string;
      overlay: string;
      cardBg: string;
      cardBorder: string;
      gradient: string;
    };
    icon: {
      primary: string;
      secondary: string;
      muted: string;
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    surface: {
      border: string;
      shadow: string;
    };
  }
  interface PaletteOptions {
    hero?: {
      background: string;
      text: string;
      textSecondary: string;
      overlay: string;
      cardBg: string;
      cardBorder: string;
      gradient?: string;
    };
    icon?: {
      primary: string;
      secondary: string;
      muted: string;
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    surface?: {
      border?: string;
      shadow?: string;
    };
  }
}

/**
 * Gatherle Dark Mode Color Palette
 * Keep this aligned with the mobile palette in apps/mobile/src/app/theme/palette.ts.
 */
const darkModeColors: PaletteOptions = {
  common: {
    black: '#000000',
    white: '#ffffff',
  },
  primary: {
    light: '#a29bff',
    main: '#7a73ff',
    dark: '#5850ec',
    contrastText: '#ffffff',
  },
  secondary: {
    light: '#ffb27a',
    main: '#ff8d3b',
    dark: '#ff7a1a',
    contrastText: '#ffffff',
  },
  error: {
    main: '#f97066',
    light: '#fda29b',
    dark: '#f04438',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#fbbf24',
    light: '#fde68a',
    dark: '#f79009',
    contrastText: '#1f2937',
  },
  info: {
    main: '#38bdf8',
    light: '#7dd3fc',
    dark: '#0284c7',
    contrastText: '#ffffff',
  },
  success: {
    main: '#32d583',
    light: '#6ee7b7',
    dark: '#12b76a',
    contrastText: '#1f2937',
  },
  background: {
    default: '#0C1014',
    paper: '#0f151a',
  },
  action: {
    active: '#cbd5e1',
    hover: '#162338',
    selected: '#2a2575',
    disabled: '#94a3b8',
    disabledBackground: '#171c1f',
    focus: '#2a2575',
  },
  grey: {
    50: '#f8fafc',
    100: '#cbd5e1',
    200: '#94a3b8',
    300: '#667085',
    400: '#475467',
    500: '#344054',
    600: '#1d2939',
    700: '#171c1f',
    800: '#162338',
    900: '#0C1014',
  },
  surface: {
    border: 'rgba(203, 213, 225, 0.16)',
    shadow: '0 30px 75px rgba(0, 0, 0, 0.75)',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    disabled: '#94a3b8',
  },
  divider: 'rgba(203, 213, 225, 0.16)',
  hero: {
    background: '#0f172a',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    overlay: 'rgba(0, 0, 0, 0.6)',
    cardBg: 'rgba(255, 255, 255, 0.06)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    gradient: 'linear-gradient(135deg, #7a73ff 0%, #4338ca 100%)',
  },
  icon: {
    primary: '#7a73ff',
    secondary: '#ff8d3b',
    muted: '#94a3b8',
    success: '#32d583',
    warning: '#fbbf24',
    error: '#f97066',
    info: '#38bdf8',
  },
};

export default darkModeColors;
