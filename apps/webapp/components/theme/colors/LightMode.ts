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
 * Gatherle Light Mode Color Palette
 * Keep this aligned with the mobile palette in apps/mobile/src/app/theme/palette.ts.
 */
const lightModeColors: PaletteOptions = {
  common: {
    black: '#000000',
    white: '#ffffff',
  },
  primary: {
    light: '#7a73ff',
    main: '#5850ec',
    dark: '#4338ca',
    contrastText: '#ffffff',
  },
  secondary: {
    light: '#ff9b55',
    main: '#ff7a1a',
    dark: '#c2410c',
    contrastText: '#ffffff',
  },
  error: {
    main: '#f04438',
    light: '#f97066',
    dark: '#b42318',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f79009',
    light: '#fdb022',
    dark: '#b54708',
    contrastText: '#ffffff',
  },
  info: {
    main: '#0284c7',
    light: '#0ea5e9',
    dark: '#0369a1',
    contrastText: '#ffffff',
  },
  success: {
    main: '#12b76a',
    light: '#32d583',
    dark: '#027a48',
    contrastText: '#ffffff',
  },
  background: {
    default: '#ffffff',
    paper: '#ffffff',
  },
  action: {
    active: '#667085',
    hover: '#f8fafc',
    selected: '#ede9fe',
    disabled: '#98a2b3',
    disabledBackground: '#f2f2f2',
    focus: '#ede9fe',
  },
  grey: {
    50: '#f8fafc',
    100: '#f2f2f2',
    200: '#d9dee7',
    300: '#cbd5e1',
    400: '#98a2b3',
    500: '#667085',
    600: '#475467',
    700: '#344054',
    800: '#1d2939',
    900: '#0b1736',
  },
  surface: {
    border: '#d9dee7',
    shadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
  },
  text: {
    primary: '#0b1736',
    secondary: '#667085',
    disabled: '#98a2b3',
  },
  divider: '#d9dee7',
  hero: {
    background: '#111827',
    text: '#f8fafc',
    textSecondary: '#e2e8f0',
    overlay: 'rgba(15, 23, 42, 0.5)',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    cardBorder: 'rgba(255, 255, 255, 0.15)',
    gradient: 'linear-gradient(135deg, #5850ec 0%, #4338ca 100%)',
  },
  icon: {
    primary: '#5850ec',
    secondary: '#ff7a1a',
    muted: '#98a2b3',
    success: '#12b76a',
    warning: '#f79009',
    error: '#f04438',
    info: '#0284c7',
  },
};

export default lightModeColors;
