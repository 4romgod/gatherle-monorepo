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
 *
 * Philosophy: Immersive, easy on the eyes, nightlife-ready
 * - Primary (Indigo): Professional blue, less saturated for dark mode
 * - Secondary (Coral): Maintains energy while being dark-mode friendly
 * - Deep neutral backgrounds with strategic color accents
 *
 * Optimized for evening/night use when users browse events
 */
const darkModeColors: PaletteOptions = {
  primary: {
    light: '#a5b4fc', // Lighter indigo for dark mode visibility
    main: '#6366f1', // Balanced indigo - vibrant but not overwhelming
    dark: '#4f46e5', // Rich indigo for depth
    contrastText: '#ffffff',
  },
  secondary: {
    light: '#fbbf24', // Warm amber-orange
    main: '#f97316', // Vibrant coral (consistent with light mode)
    dark: '#ea580c', // Slightly lighter dark variant for visibility
    contrastText: '#ffffff',
  },
  error: {
    main: '#f87171', // Softer red for dark mode
    light: '#fca5a5',
    dark: '#dc2626',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#fbbf24', // Bright amber
    light: '#fde047',
    dark: '#f59e0b',
    contrastText: '#1f2937',
  },
  info: {
    main: '#38bdf8', // Bright sky blue
    light: '#7dd3fc',
    dark: '#0284c7',
    contrastText: '#ffffff',
  },
  success: {
    main: '#34d399', // Bright emerald for dark mode
    light: '#6ee7b7',
    dark: '#059669',
    contrastText: '#1f2937',
  },
  background: {
    default: '#111827', // Gray 900 - deep neutral background
    paper: '#1f2937', // Gray 800 - elevated surfaces
  },
  surface: {
    border: 'rgba(255, 255, 255, 0.18)',
    shadow: '0 30px 75px rgba(0, 0, 0, 0.75)',
  },
  text: {
    primary: '#f9fafb', // Gray 50 - crisp white for readability
    secondary: '#9ca3af', // Gray 400 - clear secondary text
    disabled: '#4b5563', // Gray 600 - disabled states
  },
  divider: 'rgba(156, 163, 175, 0.15)', // Subtle gray divider
  hero: {
    background: '#0f172a', // Slate 900 - deep neutral
    text: '#f8fafc', // Slate 50 - crisp white
    textSecondary: '#e2e8f0', // Slate 200 - high contrast secondary
    overlay: 'rgba(0, 0, 0, 0.6)',
    cardBg: 'rgba(255, 255, 255, 0.05)', // Subtle white overlay
    cardBorder: 'rgba(255, 255, 255, 0.1)', // Subtle border
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', // Softer indigo for dark mode
  },
  icon: {
    primary: '#6366f1', // Indigo - less intense for dark mode
    secondary: '#f97316', // Coral - maintains energy
    muted: '#9ca3af', // Gray 400 - informational, good contrast
    success: '#34d399', // Bright emerald - clear positive signal
    warning: '#fbbf24', // Bright amber - attention grabbing
    error: '#f87171', // Soft red - clear but not harsh
    info: '#38bdf8', // Bright sky - helpful and visible
  },
};

export default darkModeColors;
