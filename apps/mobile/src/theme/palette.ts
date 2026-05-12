export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    surfaceRaised: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryContrast: string;
    primarySoft: string;
    secondary: string;
    secondarySoft: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    error: string;
    errorSoft: string;
    tabBar: string;
    tabBarBorder: string;
    heroBackground: string;
    heroText: string;
    heroSubtle: string;
    heroCard: string;
    heroCardBorder: string;
    heroGradient: readonly [string, string];
  };
};

export const lightTheme: AppTheme = {
  mode: 'light',
  dark: false,
  colors: {
    background: '#f9fafb',
    surface: '#ffffff',
    surfaceMuted: '#f3f4f6',
    surfaceRaised: '#eef2ff',
    border: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    primary: '#4f46e5',
    primaryContrast: '#ffffff',
    primarySoft: '#e0e7ff',
    secondary: '#f97316',
    secondarySoft: '#ffedd5',
    success: '#059669',
    successSoft: '#d1fae5',
    warning: '#f59e0b',
    warningSoft: '#fef3c7',
    error: '#dc2626',
    errorSoft: '#fee2e2',
    tabBar: '#ffffff',
    tabBarBorder: '#e5e7eb',
    heroBackground: '#1e293b',
    heroText: '#f8fafc',
    heroSubtle: '#e2e8f0',
    heroCard: 'rgba(255, 255, 255, 0.08)',
    heroCardBorder: 'rgba(255, 255, 255, 0.15)',
    heroGradient: ['#4f46e5', '#3730a3'],
  },
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  dark: true,
  colors: {
    background: '#111827',
    surface: '#1f2937',
    surfaceMuted: '#273449',
    surfaceRaised: '#312e81',
    border: 'rgba(156, 163, 175, 0.18)',
    textPrimary: '#f9fafb',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    primary: '#6366f1',
    primaryContrast: '#ffffff',
    primarySoft: '#312e81',
    secondary: '#f97316',
    secondarySoft: '#7c2d12',
    success: '#34d399',
    successSoft: '#064e3b',
    warning: '#fbbf24',
    warningSoft: '#78350f',
    error: '#f87171',
    errorSoft: '#7f1d1d',
    tabBar: '#1f2937',
    tabBarBorder: 'rgba(156, 163, 175, 0.18)',
    heroBackground: '#0f172a',
    heroText: '#f8fafc',
    heroSubtle: '#cbd5e1',
    heroCard: 'rgba(255, 255, 255, 0.06)',
    heroCardBorder: 'rgba(255, 255, 255, 0.12)',
    heroGradient: ['#6366f1', '#4338ca'],
  },
};
