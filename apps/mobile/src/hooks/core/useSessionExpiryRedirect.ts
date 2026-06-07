import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import type { MainTabParamList } from '@/app/navigation/routes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { classifyFrontendFailure } from '@/lib/errors/frontendFailure';

type UseSessionExpiryRedirectOptions = {
  error: unknown;
  redirectTab: keyof MainTabParamList;
};

export function useSessionExpiryRedirect({ error, redirectTab }: UseSessionExpiryRedirectOptions) {
  const navigation = useNavigation<MainTabNavigation>();
  const { showToast } = useAppFeedback();
  const { hasLiveSession, signOut } = useAppShell();
  const handledExpiryRef = useRef(false);
  const failureKind = classifyFrontendFailure(error);

  useEffect(() => {
    if (!hasLiveSession || failureKind !== 'session-expired') {
      if (failureKind !== 'session-expired') {
        handledExpiryRef.current = false;
      }
      return;
    }

    if (handledExpiryRef.current) {
      return;
    }

    handledExpiryRef.current = true;
    showToast({
      message: 'Sign in again to keep going.',
      title: 'Session expired',
      tone: 'info',
    });
    signOut();
    navigation.navigate('Login', { redirectTab });
  }, [failureKind, hasLiveSession, navigation, redirectTab, showToast, signOut]);

  return failureKind;
}
