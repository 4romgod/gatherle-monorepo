import { useApolloClient } from '@apollo/client';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  RegisterPushSubscriptionDocument,
  UnregisterPushSubscriptionDocument,
} from '@data/graphql/mutation/PushSubscription/mutation';
import { PushSubscriptionPlatform, PushSubscriptionProvider } from '@data/graphql/types/graphql';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { navigationRef } from '@/app/navigation/navigationRef';
import { useAppShell } from './AppShellProvider';
import { getApolloAuthContext } from '@/lib/auth';
import { isInvalidSessionError } from '@/lib/auth/sessionValidation';
import { DEVICE_STORAGE_KEYS, readStoredString, writeStoredString } from '@/lib/deviceStorage';
import { navigateFromNotificationActionUrl } from '@/lib/notifications/actionUrl';

const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || '7eee58bf-18f8-4b6d-a0a4-128a5d1f037b';

type PushRegistrationStatus = 'denied' | 'error' | 'granted' | 'unsupported';

type RegisteredPushToken = {
  authToken: string;
  token: string;
  userId: string;
};

type PushNotificationsContextValue = {
  handlePendingNotificationResponse: () => Promise<void>;
  hasPendingNotificationResponse: boolean;
  requestPermissionAndRegister: () => Promise<PushRegistrationStatus>;
};

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

function resolvePushPlatform(): PushSubscriptionPlatform | null {
  if (Platform.OS === 'android') {
    return PushSubscriptionPlatform.Android;
  }

  if (Platform.OS === 'ios') {
    return PushSubscriptionPlatform.Ios;
  }

  return null;
}

function readNotificationActionUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const maybeActionUrl =
    typeof payload.actionUrl === 'string' ? payload.actionUrl : typeof payload.url === 'string' ? payload.url : null;

  return typeof maybeActionUrl === 'string' && maybeActionUrl.trim().length > 0 ? maybeActionUrl : null;
}

async function getOrCreateDeviceInstallationId(): Promise<string> {
  const existingInstallationId = await readStoredString(DEVICE_STORAGE_KEYS.pushInstallationId);
  if (existingInstallationId) {
    return existingInstallationId;
  }

  const nextInstallationId = Crypto.randomUUID();
  await writeStoredString(DEVICE_STORAGE_KEYS.pushInstallationId, nextInstallationId);
  return nextInstallationId;
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Gatherle alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

type PushRegistrationPayload = {
  provider: PushSubscriptionProvider;
  token: string;
};

async function getPushRegistrationPayload(platform: PushSubscriptionPlatform): Promise<PushRegistrationPayload> {
  if (platform === PushSubscriptionPlatform.Android) {
    const nativePushToken = await Notifications.getDevicePushTokenAsync();
    const nativeTokenValue =
      typeof nativePushToken.data === 'string' && nativePushToken.data.trim().length > 0 ? nativePushToken.data : null;

    if (!nativeTokenValue) {
      throw new Error('Android push registration did not return a usable FCM token.');
    }

    return {
      provider: PushSubscriptionProvider.Fcm,
      token: nativeTokenValue,
    };
  }

  return {
    provider: PushSubscriptionProvider.Expo,
    token: (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data,
  };
}

export function PushNotificationsProvider({ children }: PropsWithChildren) {
  const apolloClient = useApolloClient();
  const { authToken, userId } = useAppShell();
  const handledNotificationIdRef = useRef<string | null>(null);
  const pendingNotificationResponseRef = useRef<Notifications.NotificationResponse | null>(null);
  const registrationPromiseRef = useRef<Promise<PushRegistrationStatus> | null>(null);
  const registeredTokenRef = useRef<RegisteredPushToken | null>(null);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);

  const unregisterToken = useCallback(
    async (registeredToken: RegisteredPushToken): Promise<void> => {
      try {
        await apolloClient.mutate({
          mutation: UnregisterPushSubscriptionDocument,
          variables: {
            token: registeredToken.token,
          },
          ...getApolloAuthContext(registeredToken.authToken),
        });
      } catch (error) {
        console.warn('[PushNotificationsProvider] Failed to unregister push token', error);
      } finally {
        if (
          registeredTokenRef.current?.token === registeredToken.token &&
          registeredTokenRef.current?.userId === registeredToken.userId
        ) {
          registeredTokenRef.current = null;
        }
      }
    },
    [apolloClient],
  );

  const registerCurrentDevice = useCallback(
    ({ requestPermissions }: { requestPermissions: boolean }): Promise<PushRegistrationStatus> => {
      if (registrationPromiseRef.current) {
        return registrationPromiseRef.current;
      }

      const registrationPromise = (async (): Promise<PushRegistrationStatus> => {
        if (!authToken || !userId) {
          return 'unsupported';
        }

        const platform = resolvePushPlatform();
        if (!platform) {
          return 'unsupported';
        }

        await ensureAndroidNotificationChannel();

        const permissions = await Notifications.getPermissionsAsync();
        let permissionStatus = permissions.status;

        if (requestPermissions && permissionStatus !== 'granted') {
          const requestedPermissions = await Notifications.requestPermissionsAsync();
          permissionStatus = requestedPermissions.status;
        }

        if (permissionStatus !== 'granted') {
          return 'denied';
        }

        let pushRegistration: PushRegistrationPayload;

        try {
          pushRegistration = await getPushRegistrationPayload(platform);
        } catch (error) {
          console.warn('[PushNotificationsProvider] Failed to acquire push token', error);
          return 'error';
        }

        if (
          registeredTokenRef.current?.userId === userId &&
          registeredTokenRef.current?.token === pushRegistration.token
        ) {
          return 'granted';
        }

        try {
          const deviceInstallationId = await getOrCreateDeviceInstallationId();

          await apolloClient.mutate({
            mutation: RegisterPushSubscriptionDocument,
            variables: {
              input: {
                provider: pushRegistration.provider,
                platform,
                token: pushRegistration.token,
                deviceInstallationId,
              },
            },
            ...getApolloAuthContext(authToken),
          });

          registeredTokenRef.current = {
            authToken,
            token: pushRegistration.token,
            userId,
          };

          return 'granted';
        } catch (error) {
          console.warn('[PushNotificationsProvider] Failed to register push token with the API', error);
          return 'error';
        }
      })();

      registrationPromiseRef.current = registrationPromise;

      return registrationPromise.finally(() => {
        if (registrationPromiseRef.current === registrationPromise) {
          registrationPromiseRef.current = null;
        }
      });
    },
    [apolloClient, authToken, userId],
  );

  const handleNotificationResponse = useCallback(
    async (response?: Notifications.NotificationResponse | null) => {
      const resolvedResponse =
        response ?? pendingNotificationResponseRef.current ?? Notifications.getLastNotificationResponse();
      const notification = resolvedResponse?.notification;
      const notificationId = notification?.request.identifier;

      if (!notification || !notificationId) {
        return;
      }

      pendingNotificationResponseRef.current = resolvedResponse;
      setPendingNotificationId(notificationId);

      if (!navigationRef.isReady()) {
        return;
      }

      if (handledNotificationIdRef.current === notificationId) {
        if (pendingNotificationResponseRef.current?.notification.request.identifier === notificationId) {
          pendingNotificationResponseRef.current = null;
          setPendingNotificationId(null);
        }
        return;
      }

      if (!authToken) {
        navigationRef.navigate('Login', { redirectTab: 'Notifications' });
        return;
      }

      try {
        const actionUrl = readNotificationActionUrl(notification.request.content.data);
        const navigated = await navigateFromNotificationActionUrl({
          actionUrl,
          apolloClient,
          authToken,
          navigation: navigationRef as unknown as MainTabNavigation,
        });

        handledNotificationIdRef.current = notificationId;
        pendingNotificationResponseRef.current = null;
        setPendingNotificationId(null);

        if (!navigated) {
          navigationRef.navigate('MainTabs', { screen: 'Notifications' });
        }
      } catch (error) {
        if (isInvalidSessionError(error)) {
          navigationRef.navigate('Login', { redirectTab: 'Notifications' });
          return;
        }

        console.warn('[PushNotificationsProvider] Failed to navigate from notification action URL', error);
        handledNotificationIdRef.current = notificationId;
        pendingNotificationResponseRef.current = null;
        setPendingNotificationId(null);
        navigationRef.navigate('MainTabs', { screen: 'Notifications' });
      }
    },
    [apolloClient, authToken],
  );

  useEffect(() => {
    if (!authToken || !userId || Platform.OS === 'web') {
      const previouslyRegisteredToken = registeredTokenRef.current;
      if (previouslyRegisteredToken) {
        void unregisterToken(previouslyRegisteredToken);
      }
      return;
    }

    void registerCurrentDevice({ requestPermissions: false });
  }, [authToken, registerCurrentDevice, unregisterToken, userId]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const pushTokenSubscription = Notifications.addPushTokenListener((nextPushToken) => {
      if (!authToken || !userId) {
        return;
      }

      const nextTokenValue =
        typeof nextPushToken.data === 'string' && nextPushToken.data.trim().length > 0
          ? nextPushToken.data.trim()
          : null;

      if (!nextTokenValue) {
        return;
      }

      if (registeredTokenRef.current?.userId === userId && registeredTokenRef.current?.token === nextTokenValue) {
        return;
      }

      void registerCurrentDevice({ requestPermissions: false });
    });

    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response);
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }

      if (authToken && userId) {
        void registerCurrentDevice({ requestPermissions: false });
      }

      void handleNotificationResponse();
    });

    void handleNotificationResponse();

    return () => {
      pushTokenSubscription.remove();
      notificationResponseSubscription.remove();
      appStateSubscription.remove();
    };
  }, [authToken, handleNotificationResponse, registerCurrentDevice, userId]);

  const contextValue = useMemo<PushNotificationsContextValue>(
    () => ({
      handlePendingNotificationResponse: async () => handleNotificationResponse(),
      hasPendingNotificationResponse: pendingNotificationId != null,
      requestPermissionAndRegister: async () => registerCurrentDevice({ requestPermissions: true }),
    }),
    [handleNotificationResponse, pendingNotificationId, registerCurrentDevice],
  );

  return <PushNotificationsContext.Provider value={contextValue}>{children}</PushNotificationsContext.Provider>;
}

export function usePushNotifications() {
  const context = useContext(PushNotificationsContext);

  if (!context) {
    throw new Error('usePushNotifications must be used inside PushNotificationsProvider.');
  }

  return context;
}
