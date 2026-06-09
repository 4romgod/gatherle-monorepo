'use client';

import { useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { GetUserByIdDocument } from '@/data/graphql/query/User/query';
import { useLogout } from '@/hooks/useLogout';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader, logger } from '@/lib/utils';
import {
  getAppAccessBlockedMessage,
  isAppAccessBlockedError,
  notifyAppAccessBlocked,
  storeBlockedAccountMessage,
  subscribeToAppAccessBlocked,
} from '@/lib/utils/app-access-block';

export default function AppAccessBlockSessionManager() {
  const apolloClient = useApolloClient();
  const { data: session, status } = useSession();
  const { logout } = useLogout(ROUTES.ACCOUNT_BLOCKED);
  const handledBlockRef = useRef(false);
  const validatedSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return subscribeToAppAccessBlocked((message) => {
      if (handledBlockRef.current) {
        return;
      }

      handledBlockRef.current = true;
      storeBlockedAccountMessage(message);

      void logout({ redirect: false, redirectTo: ROUTES.ACCOUNT_BLOCKED })
        .catch((error) => {
          logger.error('Failed to clear blocked account session', error);
        })
        .finally(() => {
          window.location.replace(ROUTES.ACCOUNT_BLOCKED);
        });
    });
  }, [logout]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.token || !session.user.userId) {
      handledBlockRef.current = false;
      validatedSessionKeyRef.current = null;
      return;
    }

    const sessionKey = `${session.user.userId}:${session.user.token}`;
    if (validatedSessionKeyRef.current === sessionKey) {
      return;
    }

    handledBlockRef.current = false;
    validatedSessionKeyRef.current = sessionKey;

    void apolloClient
      .query({
        query: GetUserByIdDocument,
        variables: {
          userId: session.user.userId,
        },
        context: {
          headers: getAuthHeader(session.user.token),
        },
        fetchPolicy: 'no-cache',
      })
      .catch((error) => {
        if (isAppAccessBlockedError(error)) {
          notifyAppAccessBlocked(getAppAccessBlockedMessage(error));
          return;
        }

        logger.warn('Failed to validate web session against app access policy', error);
      });
  }, [apolloClient, session?.user?.token, session?.user?.userId, status]);

  return null;
}
