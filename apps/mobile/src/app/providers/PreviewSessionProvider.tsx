import type { AuthenticatedMobileUser } from '@data/graphql/mutation/User/types';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearStoredSession, readStoredSession, writeStoredSession } from '@/lib/sessionStorage';

type PreviewSessionContextValue = {
  authToken: string | null;
  email: string | null;
  hasLiveSession: boolean;
  isAuthenticated: boolean;
  isSessionReady: boolean;
  pendingVerificationEmail: string | null;
  previewAuthEnabled: boolean;
  setPendingVerificationEmail: (value: string | null) => void;
  setPreviewAuthenticated: (value: boolean) => void;
  updateSessionIdentity: (input: { email?: string | null; username?: string | null }) => void;
  signIn: (user: AuthenticatedMobileUser) => void;
  signOut: () => void;
  togglePreviewAuth: () => void;
  userId: string | null;
  username: string | null;
};

type AuthSession = {
  email: string;
  token: string;
  userId: string;
  username: string | null;
};

function normalizeEnvValue(value?: string) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

const PREVIEW_AUTH_TOKEN = normalizeEnvValue(process.env.EXPO_PUBLIC_AUTH_TOKEN);
const PREVIEW_USERNAME = normalizeEnvValue(process.env.EXPO_PUBLIC_PREVIEW_USERNAME);

const PreviewSessionContext = createContext<PreviewSessionContextValue | null>(null);

export function PreviewSessionProvider({ children }: PropsWithChildren) {
  const [isSessionReady, setSessionReady] = useState(false);
  const [previewAuthEnabled, setPreviewAuthenticated] = useState(false);
  const [liveSession, setLiveSession] = useState<AuthSession | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedSession = await readStoredSession();

      if (!isMounted) {
        return;
      }

      setLiveSession(storedSession);
      setSessionReady(true);
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const togglePreviewAuth = () => {
    if (liveSession) {
      return;
    }

    setPreviewAuthenticated((current) => !current);
  };

  const signIn = (user: AuthenticatedMobileUser) => {
    const nextSession = {
      email: user.email,
      token: user.token,
      userId: user.userId,
      username: user.username ?? null,
    };

    setLiveSession(nextSession);
    setPendingVerificationEmail(null);
    setSessionReady(true);
    void writeStoredSession(nextSession);
  };

  const signOut = () => {
    setLiveSession(null);
    setPendingVerificationEmail(null);
    setPreviewAuthenticated(false);
    setSessionReady(true);
    void clearStoredSession();
  };

  const updateSessionIdentity = (input: { email?: string | null; username?: string | null }) => {
    setLiveSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      const nextSession = {
        ...currentSession,
        email: input.email ?? currentSession.email,
        username: input.username ?? currentSession.username,
      };

      void writeStoredSession(nextSession);
      return nextSession;
    });
  };

  const value = useMemo<PreviewSessionContextValue>(
    () => ({
      authToken: liveSession?.token ?? PREVIEW_AUTH_TOKEN,
      email: liveSession?.email ?? pendingVerificationEmail,
      hasLiveSession: Boolean(liveSession),
      isAuthenticated: Boolean(liveSession) || previewAuthEnabled,
      isSessionReady,
      pendingVerificationEmail,
      previewAuthEnabled,
      setPendingVerificationEmail,
      setPreviewAuthenticated,
      signIn,
      signOut,
      togglePreviewAuth,
      userId: liveSession?.userId ?? null,
      updateSessionIdentity,
      username: liveSession?.username ?? PREVIEW_USERNAME,
    }),
    [isSessionReady, liveSession, pendingVerificationEmail, previewAuthEnabled],
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
