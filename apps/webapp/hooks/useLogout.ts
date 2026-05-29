'use client';

import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { signOut } from 'next-auth/react';
import { ROUTES } from '@/lib/constants';
import { logger } from '@/lib/utils';

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
        await apolloClient.clearStore();
      } catch (error) {
        logger.warn('Failed to clear Apollo cache during logout', error);
      }

      try {
        if (shouldRedirect) {
          await signOut({ redirect: true, redirectTo: resolvedRedirectTo });
        } else {
          await signOut({ redirect: false });
        }
      } catch (error) {
        logger.error('Failed to sign out user', error);
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
