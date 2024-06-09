import '@/components/global.css';
import React, { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { CustomAppContextProvider } from '@/components/app-context';
import { ApolloWrapper } from '@/data/graphql/apollo-provider';
import { SessionProvider } from 'next-auth/react';
import CustomThemeProvider from '@/components/custom-providers/theme-provider';
import ToastProvider from '@/components/custom-providers/toast-provider';
import MainNavigation from '@/components/navigation/main';
import Footer from '@/components/footer';
import { Box } from '@mui/material';
import { auth } from '@/auth';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <ApolloWrapper>
        <AppRouterCacheProvider>
          <SessionProvider session={session}>
            <CustomAppContextProvider>
              <CustomThemeProvider>
                <body>
                  <ToastProvider />
                  <MainNavigation isAuthN={Boolean(session)} />
                  <Box component="div" marginTop={15} style={{ minHeight: '100vh' }}>
                    {children}
                  </Box>
                  <Footer />
                </body>
              </CustomThemeProvider>
            </CustomAppContextProvider>
          </SessionProvider>
        </AppRouterCacheProvider>
      </ApolloWrapper>
    </html>
  );
}
