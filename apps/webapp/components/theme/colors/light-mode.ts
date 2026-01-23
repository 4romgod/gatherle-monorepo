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
  }
}

/**
 * Ntlango Light Mode Color Palette
 *
 * Philosophy: Clean, energetic, and approachable
 * - Primary (Indigo): Professional, trustworthy, not overwhelming
 * - Secondary (Coral): Energy, excitement, call-to-action
 * - Neutral-first with strategic color accents
 *
 * All colors meet WCAG AA contrast requirements
 */
const lightModeColors: PaletteOptions = {
  primary: {
    light: '#818cf8', // Soft indigo for hover states
    main: '#4f46e5', // Balanced indigo - professional, less intense than violet
    dark: '#3730a3', // Deep indigo for emphasis
    contrastText: '#ffffff',
  },
  secondary: {
    light: '#fb923c', // Bright coral for hover
    main: '#f97316', // Vibrant coral - energy, excitement, CTAs
    dark: '#c2410c', // Deep coral for active states
    contrastText: '#ffffff',
  },
  error: {
    main: '#dc2626', // Clear, accessible red
    light: '#ef4444',
    dark: '#991b1b',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f59e0b', // Amber for warnings
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#ffffff',
  },
  info: {
    main: '#0284c7', // Sky blue for informational states
    light: '#0ea5e9',
    dark: '#0369a1',
    contrastText: '#ffffff',
  },
  success: {
    main: '#059669', // Emerald for confirmations, RSVP success
    light: '#10b981',
    dark: '#047857',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f9fafb', // Gray 50 - softer than pure white
    paper: '#ffffff', // Pure white for cards
  },
  text: {
    primary: '#111827', // Gray 900 - excellent contrast
    secondary: '#6b7280', // Gray 500 - clear secondary text
    disabled: '#e5e8ec', // Gray 300 - disabled states
  },
  divider: '#e5e7eb', // Gray 200 - subtle divisions
  hero: {
    background: '#1e293b', // Slate 800 - sophisticated, not purple
    text: '#f8fafc', // Slate 50 - crisp white text
    textSecondary: '#e2e8f0', // Slate 200 - high contrast secondary
    overlay: 'rgba(15, 23, 42, 0.5)', // Slate overlay
    cardBg: 'rgba(255, 255, 255, 0.08)', // Neutral white tint
    cardBorder: 'rgba(255, 255, 255, 0.15)', // Subtle border
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', // Indigo gradient
  },
  icon: {
    primary: '#4f46e5', // Indigo - navigation, core actions
    secondary: '#f97316', // Coral - CTAs, energy (RSVP, Going, Interested)
    muted: '#6b7280', // Gray 500 - informational icons (location, time, capacity)
    success: '#059669', // Emerald - confirmations, verified badges
    warning: '#f59e0b', // Amber - alerts, capacity warnings
    error: '#dc2626', // Red - errors, cancellations
    info: '#0284c7', // Sky blue - helpful hints, tooltips
  },
};

export default lightModeColors;
