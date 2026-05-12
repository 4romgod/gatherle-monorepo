import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme,
} from '@react-navigation/native';
import { PropsWithChildren, createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { AppTheme, ThemePreference, darkTheme, lightTheme } from './palette';

type AppThemeContextValue = {
  preference: ThemePreference;
  mode: AppTheme['mode'];
  isDark: boolean;
  theme: AppTheme;
  navigationTheme: Theme;
  setPreference: (preference: ThemePreference) => void;
  toggleMode: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  const mode = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const theme = mode === 'dark' ? darkTheme : lightTheme;
  const baseTheme = mode === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;

  const navigationTheme: Theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.secondary,
    },
  };

  const toggleMode = () => {
    setPreference((currentPreference) => {
      const resolvedPreference =
        currentPreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : currentPreference;

      return resolvedPreference === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <AppThemeContext.Provider
      value={{
        preference,
        mode,
        isDark: mode === 'dark',
        theme,
        navigationTheme,
        setPreference,
        toggleMode,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider.');
  }

  return context;
}
