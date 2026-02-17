'use client';

import { useApolloClient } from '@apollo/client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  addSharedRealtimeSubscriber,
  getSharedRealtimeConnectionState,
  refreshSharedRealtimeConnection,
  removeSharedRealtimeSubscriber,
  sendSharedRealtimeAction,
  updateSharedRealtimeSubscriber,
} from '@/lib/utils/realtime';
import { WEBSOCKET_URL } from '@/lib/constants';
import { logger, normalizeWebSocketBaseUrl } from '@/lib/utils';
import { createNotificationRealtimeCacheHandlers } from './notificationRealtimeCache';
import {
  isRealtimeEventRsvpPayload,
  isRealtimeFollowRequestPayload,
  isRealtimeNotificationPayload,
  parseRealtimeEnvelope,
} from './notificationRealtimeProtocol';

/**
 * React hook that subscribes to notification-related realtime events over the
 * global shared WebSocket connection.
 */
export function useNotificationRealtime(enabled: boolean = true) {
  const client = useApolloClient();
  const { data: session } = useSession();
  const token = session?.user?.token;
  const userId = session?.user?.userId;
  const websocketBaseUrl = useMemo(() => normalizeWebSocketBaseUrl(WEBSOCKET_URL), []);
  const websocketSource = websocketBaseUrl ? 'explicit' : 'missing';

  const subscriberIdRef = useRef<number | null>(null);
  const handleRealtimeEventRsvpRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeFollowRequestRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeNotificationRef = useRef<((payload: unknown) => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      handleRealtimeEventRsvpRef.current = null;
      handleRealtimeFollowRequestRef.current = null;
      handleRealtimeNotificationRef.current = null;
      return;
    }

    const { handleRealtimeEventRsvp, handleRealtimeFollowRequest, handleRealtimeNotification } =
      createNotificationRealtimeCacheHandlers({
        client,
        userId,
      });

    handleRealtimeEventRsvpRef.current = (payload: unknown) => {
      if (!isRealtimeEventRsvpPayload(payload)) {
        logger.warn('Received malformed event RSVP websocket payload');
        return;
      }

      handleRealtimeEventRsvp(payload);
    };

    handleRealtimeFollowRequestRef.current = (payload: unknown) => {
      if (!isRealtimeFollowRequestPayload(payload)) {
        logger.warn('Received malformed follow request websocket payload');
        return;
      }

      handleRealtimeFollowRequest(payload);
    };

    handleRealtimeNotificationRef.current = (payload: unknown) => {
      if (!isRealtimeNotificationPayload(payload)) {
        logger.warn('Received malformed notification websocket payload');
        return;
      }

      handleRealtimeNotification(payload);
    };
  }, [client, userId]);

  const sendNotificationSubscribe = useCallback(() => {
    const sent = sendSharedRealtimeAction({
      action: 'notification.subscribe',
      topics: ['bell'],
    });

    if (!sent) {
      logger.warn('Failed to send notification subscription message');
    }
  }, []);

  const handleRealtimeMessage = useCallback((rawEventData: string) => {
    const parsed = parseRealtimeEnvelope(rawEventData);
    if (!parsed) {
      return;
    }

    if (parsed.type === 'notification.new') {
      handleRealtimeNotificationRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'follow.request.created' || parsed.type === 'follow.request.updated') {
      handleRealtimeFollowRequestRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'event.rsvp.updated') {
      handleRealtimeEventRsvpRef.current?.(parsed.payload);
    }
  }, []);

  useEffect(() => {
    const subscriberId = addSharedRealtimeSubscriber({
      enabled,
      setConnected: () => {},
      onOpen: sendNotificationSubscribe,
      onMessage: handleRealtimeMessage,
    });
    subscriberIdRef.current = subscriberId;

    refreshSharedRealtimeConnection({
      token,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!subscriberIdRef.current) {
      return;
    }

    updateSharedRealtimeSubscriber(subscriberIdRef.current, {
      enabled,
      onOpen: sendNotificationSubscribe,
      onMessage: handleRealtimeMessage,
    });

    refreshSharedRealtimeConnection({
      token,
      userId,
      websocketBaseUrl,
      websocketSource,
    });

    if (enabled && getSharedRealtimeConnectionState()) {
      sendNotificationSubscribe();
    }
  }, [enabled, handleRealtimeMessage, sendNotificationSubscribe, token, userId, websocketBaseUrl, websocketSource]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!userId) {
      logger.warn('Notification realtime disabled because session user is missing');
      return;
    }

    if (!websocketBaseUrl) {
      logger.error('Notification websocket URL is not configured', {
        websocketSource,
        hasExplicitWebsocketUrl: Boolean(WEBSOCKET_URL.trim()),
      });
    }
  }, [enabled, userId, websocketBaseUrl, websocketSource]);
}
