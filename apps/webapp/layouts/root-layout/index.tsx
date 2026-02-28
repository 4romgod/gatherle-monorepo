'use client';

import '@/components/global.css';
import 'nprogress/nprogress.css';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { CustomAppContextProvider } from '@/components/context/AppContext';
import { ApolloWrapper } from '@/data/graphql/apollo-wrapper';
import { SessionProvider } from 'next-auth/react';
import CustomThemeProvider from '@/components/context/providers/ThemeProvider';
import ToastProvider from '@/components/context/providers/ToastProvider';
import MainNavigation from '@/components/navigation/main';
import MobileBottomNav, { MOBILE_BOTTOM_NAV_HEIGHT } from '@/components/navigation/MobileBottomNav';
import Footer from '@/components/footer';
import NotificationRealtimeListener from '@/components/notifications/NotificationRealtimeListener';
import ChatRealtimeListener from '@/components/messages/ChatRealtimeListener';
import { Box } from '@mui/material';
import { Session } from 'next-auth';
import { logger } from '@/lib/utils';
import { isIndividualChatRoute } from '@/lib/constants';

const TopProgressBar = dynamic(() => import('@/components/core/progress/TopProgressBar'), { ssr: false });

export const NAV_HEIGHT = 64;

type RootLayoutProps = { children: ReactNode; session: Session | null };

export default function RootLayout({ children, session }: RootLayoutProps) {
  const pathname = usePathname();
  const isIndividualChatThreadRoute = isIndividualChatRoute(pathname);

  const isAuthN = Boolean(session?.user?.userId && session?.user?.token);
  useEffect(() => {
    logger.debug('RootLayout session updated', { isAuthN });
  }, [isAuthN]);
  // Keep SessionProvider stable across token refresh/churn to avoid tearing down realtime sockets.
  // We only need a remount boundary when auth identity changes (guest <-> user or user switch).
  const sessionProviderKey = session?.user?.userId ?? 'guest-session';

  return (
    <html lang="en">
      <body>
        <ApolloWrapper>
          <AppRouterCacheProvider>
            <SessionProvider key={sessionProviderKey} session={session}>
              <CustomAppContextProvider>
                <CustomThemeProvider>
                  <>
                    <NotificationRealtimeListener />
                    <ChatRealtimeListener />
                  </>
                  <ToastProvider />
                  <TopProgressBar />
                  <MainNavigation isAuthN={isAuthN} />
                  <MobileBottomNav />
                  <Box
                    sx={{
                      marginTop: `${NAV_HEIGHT}px`,
                      ...(isIndividualChatThreadRoute
                        ? {
                            height: `calc(100dvh - ${NAV_HEIGHT}px)`,
                            overflow: 'hidden',
                          }
                        : {
                            minHeight: '100vh',
                            pb: { xs: `${MOBILE_BOTTOM_NAV_HEIGHT}px`, md: 0 },
                          }),
                    }}
                  >
                    {children}
                  </Box>
                  {!isIndividualChatThreadRoute && (
                    <Box sx={{ pb: { xs: `${MOBILE_BOTTOM_NAV_HEIGHT}px`, md: 0 } }}>
                      <Footer />
                    </Box>
                  )}
                </CustomThemeProvider>
              </CustomAppContextProvider>
            </SessionProvider>
          </AppRouterCacheProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
