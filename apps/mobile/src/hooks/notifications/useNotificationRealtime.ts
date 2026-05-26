import { useApolloClient } from '@apollo/client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { createMobileNotificationRealtimeCacheHandlers } from '@/lib/notifications/notificationRealtimeCache';
import {
  isMobileRealtimeFollowRequestPayload,
  isMobileRealtimeNotificationDeletedPayload,
  isMobileRealtimeNotificationPayload,
  isMobileRealtimeNotificationsAllReadPayload,
  parseNotificationRealtimeEvent,
} from '@/lib/notifications/notificationRealtimeProtocol';
import {
  addSharedRealtimeSubscriber,
  getSharedRealtimeConnectionState,
  refreshSharedRealtimeConnection,
  removeSharedRealtimeSubscriber,
  sendSharedRealtimeAction,
  updateSharedRealtimeSubscriber,
} from '@/lib/realtime/sharedRealtimeConnectionManager';
import { resolveMobileWebsocketBaseUrl } from '@/lib/realtime/websocket';

const EXPLICIT_WEBSOCKET_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL ?? '';
const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL ?? '';

export function useNotificationRealtime(enabled = true) {
  const client = useApolloClient();
  const { authToken, userId } = useAppShell();
  const { websocketBaseUrl, websocketSource } = useMemo(
    () => resolveMobileWebsocketBaseUrl(EXPLICIT_WEBSOCKET_URL, GRAPHQL_URL),
    [],
  );

  const subscriberIdRef = useRef<number | null>(null);
  const handleNotificationRef = useRef<((payload: unknown) => void) | null>(null);
  const handleNotificationDeletedRef = useRef<((payload: unknown) => void) | null>(null);
  const handleNotificationsAllReadRef = useRef<((payload: unknown) => void) | null>(null);
  const handleFollowRequestRef = useRef<((payload: unknown) => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      handleNotificationRef.current = null;
      handleNotificationDeletedRef.current = null;
      handleNotificationsAllReadRef.current = null;
      handleFollowRequestRef.current = null;
      return;
    }

    const {
      handleRealtimeNotification,
      handleRealtimeNotificationDeleted,
      handleRealtimeNotificationsAllRead,
      handleRealtimeFollowRequest,
    } = createMobileNotificationRealtimeCacheHandlers({
      client,
      userId,
    });

    handleNotificationRef.current = (payload: unknown) => {
      if (!isMobileRealtimeNotificationPayload(payload)) {
        return;
      }

      handleRealtimeNotification(payload);
    };

    handleNotificationDeletedRef.current = (payload: unknown) => {
      if (!isMobileRealtimeNotificationDeletedPayload(payload)) {
        return;
      }

      handleRealtimeNotificationDeleted(payload);
    };

    handleNotificationsAllReadRef.current = (payload: unknown) => {
      if (!isMobileRealtimeNotificationsAllReadPayload(payload)) {
        return;
      }

      handleRealtimeNotificationsAllRead(payload);
    };

    handleFollowRequestRef.current = (payload: unknown) => {
      if (!isMobileRealtimeFollowRequestPayload(payload)) {
        return;
      }

      handleRealtimeFollowRequest(payload);
    };
  }, [client, userId]);

  const sendNotificationSubscribe = useCallback(() => {
    sendSharedRealtimeAction({
      action: 'notification.subscribe',
      topics: ['bell'],
    });
  }, []);

  const handleRealtimeMessage = useCallback((rawEventData: string) => {
    const realtimeEvent = parseNotificationRealtimeEvent(rawEventData);
    if (!realtimeEvent) {
      return;
    }

    if (realtimeEvent.type === 'notification.new' || realtimeEvent.type === 'notification.updated') {
      handleNotificationRef.current?.(realtimeEvent.payload);
      return;
    }

    if (realtimeEvent.type === 'notification.deleted') {
      handleNotificationDeletedRef.current?.(realtimeEvent.payload);
      return;
    }

    if (realtimeEvent.type === 'notification.all_read') {
      handleNotificationsAllReadRef.current?.(realtimeEvent.payload);
      return;
    }

    if (realtimeEvent.type === 'follow.request.created' || realtimeEvent.type === 'follow.request.updated') {
      handleFollowRequestRef.current?.(realtimeEvent.payload);
    }
  }, []);

  useEffect(() => {
    const subscriberId = addSharedRealtimeSubscriber({
      enabled,
      onMessage: handleRealtimeMessage,
      onOpen: sendNotificationSubscribe,
      setConnected: () => {},
    });

    subscriberIdRef.current = subscriberId;
    refreshSharedRealtimeConnection({
      token: authToken,
      userId,
      websocketBaseUrl,
      websocketSource,
    });

    if (enabled && getSharedRealtimeConnectionState()) {
      sendNotificationSubscribe();
    }

    return () => {
      removeSharedRealtimeSubscriber(subscriberId);
    };
  }, [authToken, enabled, handleRealtimeMessage, sendNotificationSubscribe, userId, websocketBaseUrl, websocketSource]);

  useEffect(() => {
    if (!subscriberIdRef.current) {
      return;
    }

    updateSharedRealtimeSubscriber(subscriberIdRef.current, {
      enabled,
      onMessage: handleRealtimeMessage,
      onOpen: sendNotificationSubscribe,
    });

    refreshSharedRealtimeConnection({
      token: authToken,
      userId,
      websocketBaseUrl,
      websocketSource,
    });

    if (enabled && getSharedRealtimeConnectionState()) {
      sendNotificationSubscribe();
    }
  }, [authToken, enabled, handleRealtimeMessage, sendNotificationSubscribe, userId, websocketBaseUrl, websocketSource]);
}
