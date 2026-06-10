import { useApolloClient } from '@apollo/client';
import { AppState, type AppStateStatus } from 'react-native';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { RegisterMobileDeviceAccessDocument } from '@data/graphql/mutation/MobileDeviceAccess/mutation';
import type { RegisterMobileDeviceAccessMutation } from '@data/graphql/types/graphql';
import { MobileDeviceAccessStatus } from '@data/graphql/types/graphql';
import {
  buildMobileDeviceAccessRegistrationInput,
  getOrCreateDeviceInstallationId,
  storeMobileDeviceRegistrationSecret,
} from '@/lib/deviceInstallation';

type DeviceGateState = 'approved' | 'blocked' | 'loading';

type MobileDeviceAccessContextValue = {
  accessRecord: RegisterMobileDeviceAccessMutation['registerMobileDeviceAccess'] | null;
  deviceInstallationId: string | null;
  errorMessage: string | null;
  isApproved: boolean;
  isCheckingAccess: boolean;
  refreshAccess: () => Promise<void>;
  state: DeviceGateState;
};

const MobileDeviceAccessContext = createContext<MobileDeviceAccessContextValue | null>(null);

function resolveGateState(status: MobileDeviceAccessStatus): DeviceGateState {
  if (status === MobileDeviceAccessStatus.Blocked) {
    return 'blocked';
  }

  return 'approved';
}

export function MobileDeviceAccessProvider({ children }: PropsWithChildren) {
  const apolloClient = useApolloClient();
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [state, setState] = useState<DeviceGateState>('loading');
  const [deviceInstallationId, setDeviceInstallationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessRecord, setAccessRecord] = useState<
    RegisterMobileDeviceAccessMutation['registerMobileDeviceAccess'] | null
  >(null);

  const refreshAccess = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      setState((currentState) => (currentState === 'approved' ? currentState : 'loading'));
      setErrorMessage(null);

      const registrationInput = await buildMobileDeviceAccessRegistrationInput();

      if (!registrationInput) {
        setState('approved');
        setAccessRecord(null);
        return;
      }

      setDeviceInstallationId(registrationInput.deviceInstallationId);

      try {
        const result = await apolloClient.mutate({
          mutation: RegisterMobileDeviceAccessDocument,
          variables: {
            input: registrationInput,
          },
        });

        const nextAccessRecord = result.data?.registerMobileDeviceAccess ?? null;

        if (!nextAccessRecord) {
          setState('approved');
          setErrorMessage("We couldn't refresh device access tracking right now.");
          return;
        }

        setAccessRecord(nextAccessRecord);
        if (nextAccessRecord.registrationSecret) {
          await storeMobileDeviceRegistrationSecret(nextAccessRecord.registrationSecret);
        }
        setState(resolveGateState(nextAccessRecord.status));
      } catch (error) {
        setState('approved');
        setErrorMessage(
          error instanceof Error ? error.message : "We couldn't refresh device access tracking right now.",
        );
      }
    })();

    refreshPromiseRef.current = refreshPromise;

    try {
      await refreshPromise;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [apolloClient]);

  useEffect(() => {
    void getOrCreateDeviceInstallationId()
      .then((installationId) => {
        setDeviceInstallationId(installationId);
      })
      .catch(() => {
        // Best effort only. The server-side registration is the source of truth.
      });

    void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if ((previousAppState === 'background' || previousAppState === 'inactive') && nextAppState === 'active') {
        void refreshAccess();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshAccess]);

  const value = useMemo<MobileDeviceAccessContextValue>(
    () => ({
      accessRecord,
      deviceInstallationId,
      errorMessage,
      isApproved: state === 'approved',
      isCheckingAccess: state === 'loading',
      refreshAccess,
      state,
    }),
    [accessRecord, deviceInstallationId, errorMessage, refreshAccess, state],
  );

  return <MobileDeviceAccessContext.Provider value={value}>{children}</MobileDeviceAccessContext.Provider>;
}

export function useMobileDeviceAccess() {
  const context = useContext(MobileDeviceAccessContext);

  if (!context) {
    throw new Error('useMobileDeviceAccess must be used inside MobileDeviceAccessProvider.');
  }

  return context;
}
