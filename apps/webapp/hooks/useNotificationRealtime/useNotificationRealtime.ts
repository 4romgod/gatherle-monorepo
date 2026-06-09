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
import { GRAPHQL_URL, WEBSOCKET_URL } from '@/lib/constants';
import { logger, resolveWebappWebsocketBaseUrl } from '@/lib/utils';
import { createNotificationRealtimeCacheHandlers } from './notificationRealtimeCache';
import {
  isRealtimeEventSavePayload,
  isRealtimeEventRsvpPayload,
  isRealtimeFollowRequestPayload,
  isRealtimeMomentCreatedPayload,
  isRealtimeMomentDeletedPayload,
  isRealtimeMomentUpdatedPayload,
  isRealtimeNotificationDeletedPayload,
  isRealtimeNotificationPayload,
  isRealtimeNotificationsAllReadPayload,
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
  const { websocketBaseUrl, websocketSource } = useMemo(
    () => resolveWebappWebsocketBaseUrl(WEBSOCKET_URL, GRAPHQL_URL),
    [],
  );

  const subscriberIdRef = useRef<number | null>(null);
  const handleRealtimeEventRsvpRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeFollowRequestRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeNotificationRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeNotificationDeletedRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeNotificationsAllReadRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeEventSaveRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeMomentCreatedRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeMomentUpdatedRef = useRef<((payload: unknown) => void) | null>(null);
  const handleRealtimeMomentDeletedRef = useRef<((payload: unknown) => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      handleRealtimeEventRsvpRef.current = null;
      handleRealtimeFollowRequestRef.current = null;
      handleRealtimeNotificationRef.current = null;
      handleRealtimeNotificationDeletedRef.current = null;
      handleRealtimeNotificationsAllReadRef.current = null;
      handleRealtimeEventSaveRef.current = null;
      handleRealtimeMomentCreatedRef.current = null;
      handleRealtimeMomentUpdatedRef.current = null;
      handleRealtimeMomentDeletedRef.current = null;
      return;
    }

    const {
      handleRealtimeEventRsvp,
      handleRealtimeFollowRequest,
      handleRealtimeNotification,
      handleRealtimeNotificationDeleted,
      handleRealtimeNotificationUpdated,
      handleRealtimeNotificationsAllRead,
      handleRealtimeEventSave,
      handleRealtimeMomentCreated,
      handleRealtimeMomentUpdated,
      handleRealtimeMomentDeleted,
    } = createNotificationRealtimeCacheHandlers({
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

      if (payload.notification.isRead) {
        handleRealtimeNotificationUpdated(payload);
        return;
      }

      handleRealtimeNotification(payload);
    };

    handleRealtimeNotificationDeletedRef.current = (payload: unknown) => {
      if (!isRealtimeNotificationDeletedPayload(payload)) {
        logger.warn('Received malformed notification deletion websocket payload');
        return;
      }

      handleRealtimeNotificationDeleted(payload);
    };

    handleRealtimeNotificationsAllReadRef.current = (payload: unknown) => {
      if (!isRealtimeNotificationsAllReadPayload(payload)) {
        logger.warn('Received malformed notification all-read websocket payload');
        return;
      }

      handleRealtimeNotificationsAllRead(payload);
    };

    handleRealtimeEventSaveRef.current = (payload: unknown) => {
      if (!isRealtimeEventSavePayload(payload)) {
        logger.warn('Received malformed event save websocket payload');
        return;
      }

      handleRealtimeEventSave(payload);
    };

    handleRealtimeMomentCreatedRef.current = (payload: unknown) => {
      if (!isRealtimeMomentCreatedPayload(payload)) {
        logger.warn('Received malformed moment created websocket payload');
        return;
      }

      handleRealtimeMomentCreated(payload);
    };

    handleRealtimeMomentUpdatedRef.current = (payload: unknown) => {
      if (!isRealtimeMomentUpdatedPayload(payload)) {
        logger.warn('Received malformed moment updated websocket payload');
        return;
      }

      handleRealtimeMomentUpdated(payload);
    };

    handleRealtimeMomentDeletedRef.current = (payload: unknown) => {
      if (!isRealtimeMomentDeletedPayload(payload)) {
        logger.warn('Received malformed moment deleted websocket payload');
        return;
      }

      handleRealtimeMomentDeleted(payload);
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

    if (parsed.type === 'notification.new' || parsed.type === 'notification.updated') {
      handleRealtimeNotificationRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'notification.deleted') {
      handleRealtimeNotificationDeletedRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'notification.all_read') {
      handleRealtimeNotificationsAllReadRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'follow.request.created' || parsed.type === 'follow.request.updated') {
      handleRealtimeFollowRequestRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'event.rsvp.updated') {
      handleRealtimeEventRsvpRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'event.save.updated') {
      handleRealtimeEventSaveRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'moment.created') {
      handleRealtimeMomentCreatedRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'moment.updated') {
      handleRealtimeMomentUpdatedRef.current?.(parsed.payload);
      return;
    }

    if (parsed.type === 'moment.deleted') {
      handleRealtimeMomentDeletedRef.current?.(parsed.payload);
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
