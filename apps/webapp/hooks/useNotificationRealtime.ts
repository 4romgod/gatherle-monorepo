'use client';

import { useApolloClient } from '@apollo/client';
import { useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { GetNotificationsDocument, GetUnreadNotificationCountDocument } from '@/data/graphql/query';
import type { Notification } from '@/data/graphql/query/Notification/types';
import { WEBSOCKET_URL } from '@/lib/constants';
import {
  addTokenToWebSocketUrl,
  computeReconnectDelay,
  isRecord,
  logger,
  normalizeWebSocketBaseUrl,
  PING_INTERVAL_MS,
} from '@/lib/utils';
const DEFAULT_NOTIFICATION_PAGE_LIMIT = 20;

type RealtimeEnvelope = {
  type?: unknown;
  payload?: unknown;
};

type RealtimeNotificationPayload = {
  notification: Notification;
  unreadCount: number;
};

const isRealtimeNotificationPayload = (value: unknown): value is RealtimeNotificationPayload => {
  if (!isRecord(value)) {
    return false;
  }

  const notification = value.notification;
  const unreadCount = value.unreadCount;

  if (!isRecord(notification) || typeof unreadCount !== 'number') {
    return false;
  }

  return typeof notification.notificationId === 'string' && typeof notification.recipientUserId === 'string';
};

export function useNotificationRealtime(enabled: boolean = true) {
  const client = useApolloClient();
  const { data: session } = useSession();
  const token = session?.user?.token;
  const userId = session?.user?.userId;
  const websocketBaseUrl = useMemo(() => normalizeWebSocketBaseUrl(WEBSOCKET_URL), []);
  const websocketSource = websocketBaseUrl ? 'explicit' : 'missing';

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const tokenRef = useRef<string | null>(token ?? null);
  const connectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    tokenRef.current = token ?? null;
  }, [token]);

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
      return;
    }

    shouldReconnectRef.current = true;

    const clearPing = () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const handleRealtimeNotification = (payload: RealtimeNotificationPayload) => {
      const { notification, unreadCount } = payload;

      client.writeQuery({
        query: GetUnreadNotificationCountDocument,
        data: {
          unreadNotificationCount: unreadCount,
        },
      });

      const updateNotificationListCache = (unreadOnly: boolean) => {
        client.cache.updateQuery(
          {
            query: GetNotificationsDocument,
            variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT, unreadOnly },
          },
          (existing) => {
            if (!existing?.notifications) {
              return existing;
            }

            const currentItems = existing.notifications.notifications;
            const alreadyExists = currentItems.some((item) => item.notificationId === notification.notificationId);

            let nextItems = currentItems;
            if (!alreadyExists && (!unreadOnly || notification.isRead === false)) {
              const maxItems = Math.max(currentItems.length, DEFAULT_NOTIFICATION_PAGE_LIMIT);
              nextItems = [notification as (typeof currentItems)[number], ...currentItems].slice(0, maxItems);
            }

            return {
              ...existing,
              notifications: {
                ...existing.notifications,
                unreadCount,
                notifications: nextItems,
              },
            };
          },
        );
      };

      updateNotificationListCache(false);
      updateNotificationListCache(true);
    };

    const connect = () => {
      if (!shouldReconnectRef.current) {
        return;
      }

      const activeToken = tokenRef.current;
      if (!activeToken) {
        logger.warn('Notification websocket token missing; waiting before connecting');
        return;
      }

      clearReconnectTimeout();
      clearPing();

      const socketUrl = addTokenToWebSocketUrl(websocketBaseUrl, activeToken);
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        logger.info('WebSocket connected for realtime notifications', {
          websocketBaseUrl,
          websocketSource,
        });

        try {
          socket.send(
            JSON.stringify({
              action: 'notification.subscribe',
              topics: ['bell'],
            }),
          );
        } catch (error) {
          logger.warn('Failed to send notification subscription message', error);
        }

        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'ping' }));
          }
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return;
        }

        let parsed: RealtimeEnvelope;
        try {
          parsed = JSON.parse(event.data) as RealtimeEnvelope;
        } catch {
          return;
        }

        if (parsed.type !== 'notification.new') {
          return;
        }

        if (!isRealtimeNotificationPayload(parsed.payload)) {
          logger.warn('Received malformed notification websocket payload');
          return;
        }

        handleRealtimeNotification(parsed.payload);
      };

      socket.onerror = (event) => {
        logger.warn('Notification websocket error', event);
      };

      socket.onclose = (event) => {
        clearPing();

        if (!shouldReconnectRef.current) {
          return;
        }

        const reconnectDelay = computeReconnectDelay(reconnectAttemptsRef.current);
        reconnectAttemptsRef.current += 1;

        logger.warn('Notification websocket disconnected, scheduling reconnect', {
          code: event.code,
          reason: event.reason || 'no reason',
          reconnectDelayMs: reconnectDelay,
          websocketSource,
          websocketBaseUrl,
        });

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay);
      };
    };

    connectRef.current = connect;
    connect();

    return () => {
      connectRef.current = null;
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      clearPing();

      if (socketRef.current) {
        logger.info('Closing notification websocket from effect cleanup', {
          readyState: socketRef.current.readyState,
          userId,
          hasToken: Boolean(tokenRef.current),
          websocketBaseUrl,
        });
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [client, enabled, userId, websocketBaseUrl, websocketSource]);

  useEffect(() => {
    if (!enabled || !userId || !websocketBaseUrl || !token) {
      return;
    }

    const socket = socketRef.current;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    shouldReconnectRef.current = true;
    connectRef.current?.();
  }, [enabled, userId, websocketBaseUrl, token]);
}
