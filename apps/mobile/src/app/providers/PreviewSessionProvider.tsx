import type { AuthenticatedMobileUser } from '@data/graphql/mutation/User/types';
import { useApolloClient } from '@apollo/client';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearMobileGoogleSignInSession } from '@/lib/auth/googleSignIn';
import { subscribeToAppAccessBlocked } from '@/lib/appAccessBlock';
import { clearStoredSession, readStoredSession, writeStoredSession } from '@/lib/sessionStorage';
import { validateStoredSession } from '@/lib/auth/sessionValidation';

type PreviewSessionContextValue = {
  authToken: string | null;
  blockedSessionMessage: string | null;
  dismissBlockedSessionNotice: () => void;
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
  const [blockedSessionMessage, setBlockedSessionMessage] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setLiveSession(null);
    setBlockedSessionMessage(null);
    setPendingVerificationEmail(null);
    setSessionReady(true);
    void clearStoredSession().catch((error) => {
      console.warn('[PreviewSessionProvider] Failed to clear stored session', error);
    });
    void apolloClient.clearStore().catch((error) => {
      console.warn('[PreviewSessionProvider] Failed to clear Apollo store', error);
    });
  }, [apolloClient]);

  const blockSession = useCallback(
    (message: string) => {
      setLiveSession(null);
      setBlockedSessionMessage(message);
      setPendingVerificationEmail(null);
      setSessionReady(true);
      void clearStoredSession().catch((error) => {
        console.warn('[PreviewSessionProvider] Failed to clear stored session after account block', error);
      });
      void apolloClient.clearStore().catch((error) => {
        console.warn('[PreviewSessionProvider] Failed to clear Apollo store after account block', error);
      });
    },
    [apolloClient],
  );

  useEffect(() => {
    return subscribeToAppAccessBlocked((message) => {
      blockSession(message);
    });
  }, [blockSession]);

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

      if (validationResult.kind === 'blocked') {
        blockSession(validationResult.message);
        return;
      }

      setLiveSession(validationResult.session);
      setBlockedSessionMessage(null);
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
    setBlockedSessionMessage(null);
    setPendingVerificationEmail(null);
    setSessionReady(true);
    void writeStoredSession(nextSession).catch((error) => {
      console.warn('[PreviewSessionProvider] Failed to persist session after sign-in', error);
    });
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    void clearMobileGoogleSignInSession().catch((error) => {
      console.warn('[PreviewSessionProvider] Failed to clear Google sign-in session', error);
    });
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
      blockedSessionMessage,
      dismissBlockedSessionNotice: () => setBlockedSessionMessage(null),
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
      blockedSessionMessage,
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
