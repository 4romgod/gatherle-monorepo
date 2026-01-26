'use client';

import { createContext, useState, useMemo, ReactNode, createElement } from 'react';
import { AlertProps, PaletteMode, SnackbarProps, Theme } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { getDesignTokens } from '@/components/theme/DesignTokens';

type ToastProps = SnackbarProps & AlertProps & { message: string };

type CustomAppContextType = {
  themeMode: PaletteMode;
  setThemeMode: React.Dispatch<React.SetStateAction<PaletteMode>>;
  appTheme: Theme | undefined;
  toastProps: ToastProps;
  setToastProps: React.Dispatch<React.SetStateAction<ToastProps>>;
};

const toastDefaultProps: ToastProps = {
  open: false,
  anchorOrigin: { vertical: 'top', horizontal: 'right' },
  severity: 'info',
  autoHideDuration: 4000,
  message: '',
};

export const CustomAppContext = createContext<CustomAppContextType>({
  themeMode: 'light',
  setThemeMode: () => {},
  appTheme: undefined,
  toastProps: toastDefaultProps,
  setToastProps: () => {},
});

export const CustomAppContextProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeMode] = useState<PaletteMode>('light');
  const theme = useMemo(() => createTheme(getDesignTokens(themeMode)), [themeMode]);
  const [toastProps, setToastProps] = useState<ToastProps>(toastDefaultProps);

  return createElement(
    CustomAppContext.Provider,
    {
      value: {
        themeMode,
        setThemeMode,
        appTheme: theme,
        toastProps,
        setToastProps,
      },
    },
    children,
  );
};
