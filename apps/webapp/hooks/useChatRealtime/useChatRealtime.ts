'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { WEBSOCKET_URL } from '@/lib/constants';
import { logger, normalizeWebSocketBaseUrl } from '@/lib/utils';
import {
  addSharedRealtimeSubscriber,
  getSharedRealtimeConnectionState,
  refreshSharedRealtimeConnection,
  removeSharedRealtimeSubscriber,
  sendSharedRealtimeAction,
  updateSharedRealtimeSubscriber,
  type RealtimeWebsocketSource,
} from '@/lib/utils/realtime';
import type {
  ChatConversationUpdatedRealtimePayload,
  ChatMessageRealtimePayload,
  ChatReadRealtimePayload,
} from './chatRealtimeProtocol';
import {
  isChatConversationUpdatedPayload,
  isChatMessagePayload,
  isChatReadPayload,
  parseChatRealtimeEvent,
} from './chatRealtimeProtocol';

interface UseChatRealtimeOptions {
  enabled?: boolean;
  onChatMessage?: (payload: ChatMessageRealtimePayload) => void;
  onChatRead?: (payload: ChatReadRealtimePayload) => void;
  onChatConversationUpdated?: (payload: ChatConversationUpdatedRealtimePayload) => void;
}

export type {
  ChatConversationUpdatedRealtimePayload,
  ChatMessageRealtimePayload,
  ChatReadRealtimePayload,
} from './chatRealtimeProtocol';

/**
 * React hook for subscribing to chat realtime events over the global shared WebSocket connection.
 *
 * Multiple components can call this hook; they will all use the same underlying WebSocket.
 * Each caller registers its own subscription with per-instance callbacks that are invoked
 * when relevant events are received.
 *
 * The hook automatically:
 * - Registers the caller as a subscriber to the shared connection.
 * - Keeps the subscription configuration (enabled flag and callbacks) up to date.
 * - Refreshes the shared connection when authentication or configuration changes.
 *
 * @param options - Configuration and event handlers for this subscription.
 * @param options.enabled - Whether this hook instance should be active. When false,
 *   the subscriber is disabled and will not receive events or trigger connection refreshes.
 * @param options.onChatMessage - Callback invoked when a realtime chat message is received
 *   for the current user.
 * @param options.onChatRead - Callback invoked when a conversation is marked as read in
 *   realtime.
 * @param options.onChatConversationUpdated - Callback invoked when conversation metadata
 *   (e.g. last message, participants, read status) is updated in realtime.
 *
 * @returns An object exposing the connection state and helper actions:
 * - `isConnected`: whether the shared WebSocket is currently connected.
 * - `sendChatMessage(recipientUserId, message)`: sends a chat message via the shared
 *   WebSocket connection.
 * - `markConversationRead(withUserId)`: marks the conversation with the given user as
 *   read via the shared WebSocket connection.
 */
export function useChatRealtime(options: UseChatRealtimeOptions = {}) {
  const { enabled = true, onChatMessage, onChatRead, onChatConversationUpdated } = options;
  const { data: session } = useSession();
  const token = session?.user?.token;
  const userId = session?.user?.userId;
  const websocketBaseUrl = useMemo(() => normalizeWebSocketBaseUrl(WEBSOCKET_URL), []);
  const websocketSource: RealtimeWebsocketSource = websocketBaseUrl ? 'explicit' : 'missing';

  const subscriberIdRef = useRef<number | null>(null);
  const onChatMessageRef = useRef<typeof onChatMessage>(onChatMessage);
  const onChatReadRef = useRef<typeof onChatRead>(onChatRead);
  const onChatConversationUpdatedRef = useRef<typeof onChatConversationUpdated>(onChatConversationUpdated);
  const [isConnected, setIsConnected] = useState(getSharedRealtimeConnectionState());

  const handleRealtimeMessage = useCallback((rawEventData: string) => {
    const realtimeEvent = parseChatRealtimeEvent(rawEventData);
    if (!realtimeEvent) {
      return;
    }

    if (realtimeEvent.type === 'chat.message' && isChatMessagePayload(realtimeEvent.payload)) {
      onChatMessageRef.current?.(realtimeEvent.payload);
      return;
    }

    if (realtimeEvent.type === 'chat.read' && isChatReadPayload(realtimeEvent.payload)) {
      onChatReadRef.current?.(realtimeEvent.payload);
      return;
    }

    if (realtimeEvent.type === 'chat.conversation.updated' && isChatConversationUpdatedPayload(realtimeEvent.payload)) {
      onChatConversationUpdatedRef.current?.(realtimeEvent.payload);
    }
  }, []);

  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
    onChatReadRef.current = onChatRead;
    onChatConversationUpdatedRef.current = onChatConversationUpdated;

    if (!subscriberIdRef.current) {
      return;
    }

    updateSharedRealtimeSubscriber(subscriberIdRef.current, {
      onMessage: handleRealtimeMessage,
    });
  }, [handleRealtimeMessage, onChatConversationUpdated, onChatMessage, onChatRead]);

  useEffect(() => {
    const subscriberId = addSharedRealtimeSubscriber({
      enabled,
      setConnected: setIsConnected,
      onMessage: handleRealtimeMessage,
    });
    subscriberIdRef.current = subscriberId;

    setIsConnected(getSharedRealtimeConnectionState());
    refreshSharedRealtimeConnection({
      token,
      userId,
      websocketBaseUrl,
      websocketSource,
    });

    return () => {
      removeSharedRealtimeSubscriber(subscriberId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!subscriberIdRef.current) {
      return;
    }

    updateSharedRealtimeSubscriber(subscriberIdRef.current, { enabled });
    refreshSharedRealtimeConnection({
      token,
      userId,
      websocketBaseUrl,
      websocketSource,
    });
  }, [enabled, token, userId, websocketBaseUrl, websocketSource]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!token) {
      logger.warn('Chat realtime disabled because session token is missing');
      return;
    }

    if (!websocketBaseUrl) {
      logger.error('Chat realtime websocket URL is not configured', {
        websocketSource,
        hasExplicitWebsocketUrl: Boolean(WEBSOCKET_URL.trim()),
      });
    }
  }, [enabled, token, websocketBaseUrl, websocketSource]);

  const sendChatMessage = useCallback((recipientUserId: string, message: string) => {
    return sendSharedRealtimeAction({
      action: 'chat.send',
      recipientUserId,
      message,
    });
  }, []);

  const markConversationRead = useCallback((withUserId: string) => {
    return sendSharedRealtimeAction({
      action: 'chat.read',
      withUserId,
    });
  }, []);

  return {
    isConnected,
    sendChatMessage,
    markConversationRead,
  };
}
