import type { AuthenticatedMobileUser } from '@data/graphql/mutation/User/types';
import { useApolloClient } from '@apollo/client';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearStoredSession, readStoredSession, writeStoredSession } from '@/lib/sessionStorage';
import { validateStoredSession } from '@/lib/auth/sessionValidation';

type PreviewSessionContextValue = {
  authToken: string | null;
  email: string | null;
  hasLiveSession: boolean;
  isAuthenticated: boolean;
  isSessionReady: boolean;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (value: string | null) => void;
  updateSessionIdentity: (input: { email?: string | null; username?: string | null }) => void;
  signIn: (user: AuthenticatedMobileUser) => void;
  signOut: () => void;
  userId: string | null;
  username: string | null;
};

type AuthSession = {
  email: string;
  token: string;
  userId: string;
  username: string | null;
};

const PreviewSessionContext = createContext<PreviewSessionContextValue | null>(null);

export function PreviewSessionProvider({ children }: PropsWithChildren) {
  const apolloClient = useApolloClient();
  const [isSessionReady, setSessionReady] = useState(false);
  const [liveSession, setLiveSession] = useState<AuthSession | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setLiveSession(null);
    setPendingVerificationEmail(null);
    setSessionReady(true);
    void clearStoredSession().catch((error) => {
      console.warn('[PreviewSessionProvider] Failed to clear stored session', error);
    });
    void apolloClient.clearStore().catch((error) => {
      console.warn('[PreviewSessionProvider] Failed to clear Apollo store', error);
    });
  }, [apolloClient]);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      let storedSession = null;

      try {
        storedSession = await readStoredSession();
      } catch (error) {
        console.warn('[PreviewSessionProvider] Failed to read stored session', error);
      }

      if (!isMounted) {
        return;
      }

      if (!storedSession) {
        setLiveSession(null);
        setSessionReady(true);
        return;
      }

      const validationResult = await validateStoredSession(apolloClient, storedSession);

      if (!isMounted) {
        return;
      }

      if (validationResult.kind === 'invalid') {
        clearSession();
        return;
      }

      setLiveSession(validationResult.session);
      if (
        validationResult.session.email !== storedSession.email ||
        validationResult.session.userId !== storedSession.userId ||
        validationResult.session.username !== storedSession.username
      ) {
        void writeStoredSession(validationResult.session).catch((error) => {
          console.warn('[PreviewSessionProvider] Failed to persist restored session identity', error);
        });
      }
      setSessionReady(true);
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [apolloClient, clearSession]);

  const signIn = useCallback((user: AuthenticatedMobileUser) => {
    const nextSession = {
      email: user.email,
      token: user.token,
      userId: user.userId,
      username: user.username ?? null,
    };

    setLiveSession(nextSession);
    setPendingVerificationEmail(null);
    setSessionReady(true);
    void writeStoredSession(nextSession).catch((error) => {
      console.warn('[PreviewSessionProvider] Failed to persist session after sign-in', error);
    });
  }, []);

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const updateSessionIdentity = useCallback((input: { email?: string | null; username?: string | null }) => {
    setLiveSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      const nextSession = {
        ...currentSession,
        email: input.email ?? currentSession.email,
        username: input.username ?? currentSession.username,
      };

      void writeStoredSession(nextSession).catch((error) => {
        console.warn('[PreviewSessionProvider] Failed to persist updated session identity', error);
      });
      return nextSession;
    });
  }, []);

  const value = useMemo<PreviewSessionContextValue>(
    () => ({
      authToken: liveSession?.token ?? null,
      email: liveSession?.email ?? pendingVerificationEmail,
      hasLiveSession: Boolean(liveSession),
      isAuthenticated: Boolean(liveSession),
      isSessionReady,
      pendingVerificationEmail,
      setPendingVerificationEmail,
      signIn,
      signOut,
      userId: liveSession?.userId ?? null,
      updateSessionIdentity,
      username: liveSession?.username ?? null,
    }),
    [
      isSessionReady,
      liveSession,
      pendingVerificationEmail,
      setPendingVerificationEmail,
      signIn,
      signOut,
      updateSessionIdentity,
    ],
  );

  return <PreviewSessionContext.Provider value={value}>{children}</PreviewSessionContext.Provider>;
}

export function usePreviewSession() {
  const context = useContext(PreviewSessionContext);

  if (!context) {
    throw new Error('usePreviewSession must be used inside PreviewSessionProvider.');
  }

  return context;
}
