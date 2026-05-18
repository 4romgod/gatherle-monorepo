import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme,
} from '@react-navigation/native';
import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DEVICE_STORAGE_KEYS, readStoredString, writeStoredString } from '@/lib/deviceStorage';
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
  const [hasHydratedPreference, setHasHydratedPreference] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const restorePreference = async () => {
      const storedPreference = await readStoredString(DEVICE_STORAGE_KEYS.themePreference);
      if (!isMounted) {
        return;
      }

      if (storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'system') {
        setPreference(storedPreference);
      }

      setHasHydratedPreference(true);
    };

    void restorePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedPreference) {
      return;
    }

    void writeStoredString(DEVICE_STORAGE_KEYS.themePreference, preference);
  }, [hasHydratedPreference, preference]);

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
