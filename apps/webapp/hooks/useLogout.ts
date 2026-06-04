'use client';

import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { signOut } from 'next-auth/react';
import { logoutUserAction } from '@/data/actions/server/auth/logout';
import { ROUTES } from '@/lib/constants';
import { logger } from '@/lib/utils';
import { clearLogoutBrowserState } from '@/lib/utils/logout';

type LogoutOptions = {
  redirect?: boolean;
  redirectTo?: string;
};

export function useLogout(redirectTo = ROUTES.ROOT) {
  const apolloClient = useApolloClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(
    async (options: LogoutOptions = {}) => {
      const shouldRedirect = options.redirect ?? true;
      const resolvedRedirectTo = options.redirectTo ?? redirectTo;
      setIsLoggingOut(true);
      try {
        clearLogoutBrowserState();

        try {
          await apolloClient.clearStore();
        } catch (error) {
          logger.warn('Failed to clear Apollo cache during logout', error);
        }

        let serverLogoutSucceeded = false;

        try {
          await logoutUserAction(resolvedRedirectTo);
          serverLogoutSucceeded = true;
        } catch (error) {
          logger.error('Failed to clear server auth session during logout', error);
        }

        if (!serverLogoutSucceeded || !shouldRedirect) {
          try {
            await signOut({ redirect: false });
          } catch (error) {
            logger.error('Failed to sign out user', error);
            if (shouldRedirect) {
              window.location.assign(resolvedRedirectTo);
              return;
            }
          }
        }

        if (shouldRedirect) {
          window.location.replace(resolvedRedirectTo);
        }
      } catch (error) {
        logger.error('Unexpected logout failure', error);
        if (shouldRedirect) {
          window.location.assign(resolvedRedirectTo);
        }
      } finally {
        setIsLoggingOut(false);
      }
    },
    [apolloClient, redirectTo],
  );

  return { isLoggingOut, logout };
}
