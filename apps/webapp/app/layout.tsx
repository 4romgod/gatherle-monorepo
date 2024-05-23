'use client';

import '@/components/global.css';
import React, { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { Box, CssBaseline, IconButton, ThemeProvider } from '@mui/material';
import { useCustomAppContext, CustomAppContextProvider } from '@/components/app-context';
import MainNavigation from '@/components/navigation/main';
import Footer from '@/components/footer';
import { ApolloWrapper } from '@/data/graphql/apollo-provider';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { Close } from '@mui/icons-material';

function CustomThemeProvider({ children }: { children: ReactNode }) {
  const { appTheme } = useCustomAppContext();

  return (
    <ThemeProvider theme={appTheme!}>
      <CssBaseline />
      <body>
        <MainNavigation />
        <Box component="div" marginTop={15} style={{ minHeight: '100vh' }}>
          {children}
        </Box>
        <Footer />
      </body>
    </ThemeProvider>
  );
}

function ToastComponent() {
  const { toastProps, setToastProps } = useCustomAppContext();
  const { open, anchorOrigin, autoHideDuration, severity, message } = toastProps;

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    setToastProps({ ...toastProps, open: false });
  };

  const action = (
    <React.Fragment>
      <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
        <Close fontSize="small" />
      </IconButton>
    </React.Fragment>
  );

  return (
    <Snackbar open={open} onClose={handleClose} autoHideDuration={autoHideDuration} anchorOrigin={anchorOrigin}>
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <ApolloWrapper>
        <AppRouterCacheProvider>
          <CustomAppContextProvider>
            <CustomThemeProvider>
              <ToastComponent />
              {children}
            </CustomThemeProvider>
          </CustomAppContextProvider>
        </AppRouterCacheProvider>
      </ApolloWrapper>
    </html>
  );
}
