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
    secondaryContrast: string;
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
    background: '#ffffff',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    surfaceRaised: '#f2f2f2',
    border: '#d9dee7',
    textPrimary: '#0b1736',
    textSecondary: '#667085',
    textMuted: '#98a2b3',
    primary: '#5850ec',
    primaryContrast: '#ffffff',
    primarySoft: '#ede9fe',
    secondary: '#ff7a1a',
    secondaryContrast: '#ffffff',
    secondarySoft: '#ffedd5',
    success: '#12b76a',
    successSoft: '#d1fadf',
    warning: '#f79009',
    warningSoft: '#fef0c7',
    error: '#f04438',
    errorSoft: '#fee4e2',
    tabBar: '#ffffff',
    tabBarBorder: '#d9dee7',
    heroBackground: '#111827',
    heroText: '#f8fafc',
    heroSubtle: '#e2e8f0',
    heroCard: 'rgba(255, 255, 255, 0.08)',
    heroCardBorder: 'rgba(255, 255, 255, 0.15)',
    heroGradient: ['#5850ec', '#4338ca'],
  },
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  dark: true,
  colors: {
    background: '#0C1014',
    surface: '#0f151a',
    surfaceMuted: '#162338',
    surfaceRaised: '#171c1f',
    border: 'rgba(203, 213, 225, 0.16)',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    primary: '#7a73ff',
    primaryContrast: '#ffffff',
    primarySoft: '#2a2575',
    secondary: '#ff8d3b',
    secondaryContrast: '#ffffff',
    secondarySoft: '#7c2d12',
    success: '#32d583',
    successSoft: '#0f5132',
    warning: '#fbbf24',
    warningSoft: '#5c3b08',
    error: '#f97066',
    errorSoft: '#7a271a',
    tabBar: '#0f151a',
    tabBarBorder: 'rgba(203, 213, 225, 0.16)',
    heroBackground: '#0f172a',
    heroText: '#f8fafc',
    heroSubtle: '#cbd5e1',
    heroCard: 'rgba(255, 255, 255, 0.06)',
    heroCardBorder: 'rgba(255, 255, 255, 0.12)',
    heroGradient: ['#7a73ff', '#4338ca'],
  },
};
