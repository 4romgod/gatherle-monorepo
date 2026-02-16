'use client';

import { useApolloClient } from '@apollo/client';
import { useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { WEBSOCKET_URL } from '@/lib/constants';
import {
  addTokenToWebSocketUrl,
  computeReconnectDelay,
  logger,
  normalizeWebSocketBaseUrl,
  PING_INTERVAL_MS,
} from '@/lib/utils';
import { createNotificationRealtimeCacheHandlers } from './notificationRealtimeCache';
import {
  isRealtimeEventRsvpPayload,
  isRealtimeFollowRequestPayload,
  isRealtimeNotificationPayload,
  parseRealtimeEnvelope,
} from './notificationRealtimeProtocol';

/**
 * React hook that manages a WebSocket connection for real-time notification updates.
 *
 * The hook uses the current authenticated session to attach an access token to the
 * WebSocket URL, subscribes to notification-related events, and updates the Apollo
 * Client cache via `createNotificationRealtimeCacheHandlers`. It maintains the full
 * WebSocket lifecycle, including:
 * - establishing a connection when a user session and WebSocket base URL are available,
 * - sending periodic ping messages to keep the connection alive,
 * - handling errors and automatic reconnection with a backoff strategy, and
 * - closing the socket and clearing timers when the component unmounts or when the
 *   hook is disabled.
 *
 * @param enabled Whether the real-time WebSocket connection should be active. When
 *   `false`, the hook will not attempt to connect or reconnect, and will tear down
 *   any existing connection.
 */
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

    const { handleRealtimeEventRsvp, handleRealtimeFollowRequest, handleRealtimeNotification } =
      createNotificationRealtimeCacheHandlers({
        client,
        userId,
      });

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

    const connect = () => {
      if (!shouldReconnectRef.current) {
        return;
      }

      const activeSocket = socketRef.current;
      if (
        activeSocket &&
        (activeSocket.readyState === WebSocket.OPEN || activeSocket.readyState === WebSocket.CONNECTING)
      ) {
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
        if (socketRef.current !== socket) {
          socket.close();
          return;
        }

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

        const parsed = parseRealtimeEnvelope(event.data);
        if (!parsed) {
          return;
        }

        if (parsed.type === 'notification.new') {
          if (!isRealtimeNotificationPayload(parsed.payload)) {
            logger.warn('Received malformed notification websocket payload');
            return;
          }

          handleRealtimeNotification(parsed.payload);
          return;
        }

        if (parsed.type === 'follow.request.created' || parsed.type === 'follow.request.updated') {
          if (!isRealtimeFollowRequestPayload(parsed.payload)) {
            logger.warn('Received malformed follow request websocket payload');
            return;
          }

          handleRealtimeFollowRequest(parsed.payload);
          return;
        }

        if (parsed.type === 'event.rsvp.updated') {
          if (!isRealtimeEventRsvpPayload(parsed.payload)) {
            logger.warn('Received malformed event RSVP websocket payload');
            return;
          }

          handleRealtimeEventRsvp(parsed.payload);
        }
      };

      socket.onerror = (event) => {
        if (socketRef.current !== socket) {
          return;
        }
        logger.warn('Notification websocket error', event);
      };

      socket.onclose = (event) => {
        if (socketRef.current !== socket) {
          return;
        }

        socketRef.current = null;
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
