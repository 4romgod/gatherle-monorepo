'use client';

import {
  createContext,
  useState,
  useMemo,
  ReactNode,
  createElement,
  forwardRef,
  Dispatch,
  SetStateAction,
} from 'react';
import { AlertProps, PaletteMode, SnackbarProps, Theme } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import type { LinkProps as MuiLinkProps } from '@mui/material/Link';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { getDesignTokens } from '@/components/theme/DesignTokens';
import { usePersistentState, STORAGE_KEYS, STORAGE_NAMESPACES } from '@/hooks/usePersistentState';

type ToastProps = SnackbarProps & AlertProps & { message: string };

type CustomAppContextType = {
  themeMode: PaletteMode;
  setThemeMode: React.Dispatch<React.SetStateAction<PaletteMode>>;
  appTheme: Theme | undefined;
  toastProps: ToastProps;
  setToastProps: React.Dispatch<React.SetStateAction<ToastProps>>;
  toolbarAction: ReactNode | null;
  setToolbarAction: Dispatch<SetStateAction<ReactNode | null>>;
};

const toastDefaultProps: ToastProps = {
  open: false,
  anchorOrigin: { vertical: 'top', horizontal: 'right' },
  severity: 'info',
  autoHideDuration: 4000,
  message: '',
};

// Bridge MUI link-capable components to Next.js router navigation.
const LinkBehavior = forwardRef<HTMLAnchorElement, Omit<NextLinkProps, 'href'> & { href: NextLinkProps['href'] }>(
  function LinkBehavior(props, ref) {
    const { href, ...other } = props;
    return <NextLink ref={ref} href={href} {...other} />;
  },
);

export const CustomAppContext = createContext<CustomAppContextType>({
  themeMode: 'light',
  setThemeMode: () => {},
  appTheme: undefined,
  toastProps: toastDefaultProps,
  setToastProps: () => {},
  toolbarAction: null,
  setToolbarAction: () => {},
});

export const CustomAppContextProvider = ({ children }: { children: ReactNode }) => {
  const { value: themeMode, setValue: setThemeMode } = usePersistentState<PaletteMode>(
    STORAGE_KEYS.THEME_MODE,
    'light',
    {
      namespace: STORAGE_NAMESPACES.PREFERENCES,
      syncToBackend: false,
      serialize: (mode) => mode,
      deserialize: (mode) => (mode === 'dark' || mode === 'light' ? mode : 'light'),
    },
  );

  const theme = useMemo(
    () =>
      createTheme(getDesignTokens(themeMode), {
        components: {
          MuiLink: {
            defaultProps: {
              component: LinkBehavior,
            } as MuiLinkProps,
          },
          MuiButtonBase: {
            defaultProps: {
              LinkComponent: LinkBehavior,
            },
          },
        },
      }),
    [themeMode],
  );
  const [toastProps, setToastProps] = useState<ToastProps>(toastDefaultProps);
  const [toolbarAction, setToolbarAction] = useState<ReactNode | null>(null);

  return createElement(
    CustomAppContext.Provider,
    {
      value: {
        themeMode,
        setThemeMode,
        appTheme: theme,
        toastProps,
        setToastProps,
        toolbarAction,
        setToolbarAction,
      },
    },
    children,
  );
};
