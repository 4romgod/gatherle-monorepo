'use client';

import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { signOut } from 'next-auth/react';
import { ROUTES } from '@/lib/constants';
import { logger } from '@/lib/utils';

export function useLogout(redirectTo = ROUTES.ROOT) {
  const apolloClient = useApolloClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);

    try {
      await apolloClient.clearStore();
    } catch (error) {
      logger.warn('Failed to clear Apollo cache during logout', error);
    }

    try {
      await signOut({ redirect: true, redirectTo });
    } catch (error) {
      logger.error('Failed to sign out user', error);
      window.location.assign(redirectTo);
    } finally {
      setIsLoggingOut(false);
    }
  }, [apolloClient, redirectTo]);

  return { isLoggingOut, logout };
}
