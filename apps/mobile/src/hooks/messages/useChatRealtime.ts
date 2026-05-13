import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppShell } from '@/app/providers/AppShellProvider';
import {
  isChatConversationUpdatedPayload,
  isChatMessagePayload,
  isChatReadPayload,
  parseChatRealtimeEvent,
  type ChatConversationUpdatedRealtimePayload,
  type ChatMessageRealtimePayload,
  type ChatReadRealtimePayload,
} from '@/lib/messages/chatRealtimeProtocol';
import {
  addSharedRealtimeSubscriber,
  getSharedRealtimeConnectionState,
  refreshSharedRealtimeConnection,
  removeSharedRealtimeSubscriber,
  sendSharedRealtimeAction,
  updateSharedRealtimeSubscriber,
  type RealtimeWebsocketSource,
} from '@/lib/realtime/sharedRealtimeConnectionManager';
import { resolveMobileWebsocketBaseUrl } from '@/lib/realtime/websocket';

interface UseChatRealtimeOptions {
  enabled?: boolean;
  onChatConversationUpdated?: (payload: ChatConversationUpdatedRealtimePayload) => void;
  onChatMessage?: (payload: ChatMessageRealtimePayload) => void;
  onChatRead?: (payload: ChatReadRealtimePayload) => void;
}

const EXPLICIT_WEBSOCKET_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL ?? '';
const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL ?? '';

export function useChatRealtime(options: UseChatRealtimeOptions = {}) {
  const { enabled = true, onChatConversationUpdated, onChatMessage, onChatRead } = options;
  const { authToken, userId } = useAppShell();
  const { websocketBaseUrl, websocketSource } = useMemo(
    () => resolveMobileWebsocketBaseUrl(EXPLICIT_WEBSOCKET_URL, GRAPHQL_URL),
    [],
  );

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
      onMessage: handleRealtimeMessage,
      setConnected: setIsConnected,
    });

    subscriberIdRef.current = subscriberId;

    setIsConnected(getSharedRealtimeConnectionState());
    refreshSharedRealtimeConnection({
      token: authToken,
      userId,
      websocketBaseUrl,
      websocketSource,
    });

    return () => {
      removeSharedRealtimeSubscriber(subscriberId);
    };
  }, [authToken, enabled, handleRealtimeMessage, userId, websocketBaseUrl, websocketSource]);

  useEffect(() => {
    if (!subscriberIdRef.current) {
      return;
    }

    updateSharedRealtimeSubscriber(subscriberIdRef.current, { enabled });
    refreshSharedRealtimeConnection({
      token: authToken,
      userId,
      websocketBaseUrl,
      websocketSource: websocketSource as RealtimeWebsocketSource,
    });
  }, [authToken, enabled, userId, websocketBaseUrl, websocketSource]);

  const sendChatMessage = useCallback((recipientUserId: string, message: string) => {
    return sendSharedRealtimeAction({
      action: 'chat.send',
      message,
      recipientUserId,
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
    markConversationRead,
    sendChatMessage,
  };
}
