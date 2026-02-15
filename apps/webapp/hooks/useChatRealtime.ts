'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { WEBSOCKET_URL } from '@/lib/constants';
import {
  addTokenToWebSocketUrl,
  computeReconnectDelay,
  isRecord,
  logger,
  normalizeWebSocketBaseUrl,
  PING_INTERVAL_MS,
} from '@/lib/utils';

type RealtimeEnvelope = {
  type?: unknown;
  payload?: unknown;
};

export interface ChatMessageRealtimePayload {
  messageId: string;
  senderUserId: string;
  recipientUserId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatReadRealtimePayload {
  readerUserId: string;
  withUserId: string;
  markedCount: number;
  readAt: string;
}

export interface ChatConversationUpdatedRealtimePayload {
  conversationWithUserId: string;
  unreadCount: number;
  unreadTotal: number;
  reason: 'chat.send' | 'chat.read';
  updatedAt: string;
  lastMessage: ChatMessageRealtimePayload | null;
}

interface UseChatRealtimeOptions {
  enabled?: boolean;
  onChatMessage?: (payload: ChatMessageRealtimePayload) => void;
  onChatRead?: (payload: ChatReadRealtimePayload) => void;
  onChatConversationUpdated?: (payload: ChatConversationUpdatedRealtimePayload) => void;
}

interface ChatRealtimeSubscriber {
  enabled: boolean;
  setConnected: (connected: boolean) => void;
  onChatMessage?: (payload: ChatMessageRealtimePayload) => void;
  onChatRead?: (payload: ChatReadRealtimePayload) => void;
  onChatConversationUpdated?: (payload: ChatConversationUpdatedRealtimePayload) => void;
}

const isChatMessagePayload = (value: unknown): value is ChatMessageRealtimePayload => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.messageId === 'string' &&
    typeof value.senderUserId === 'string' &&
    typeof value.recipientUserId === 'string' &&
    typeof value.message === 'string' &&
    typeof value.isRead === 'boolean' &&
    typeof value.createdAt === 'string'
  );
};

const isChatReadPayload = (value: unknown): value is ChatReadRealtimePayload => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.readerUserId === 'string' &&
    typeof value.withUserId === 'string' &&
    typeof value.markedCount === 'number' &&
    typeof value.readAt === 'string'
  );
};

const isChatConversationUpdatedPayload = (value: unknown): value is ChatConversationUpdatedRealtimePayload => {
  if (!isRecord(value)) {
    return false;
  }

  const lastMessage = value.lastMessage;

  return (
    typeof value.conversationWithUserId === 'string' &&
    typeof value.unreadCount === 'number' &&
    typeof value.unreadTotal === 'number' &&
    (value.reason === 'chat.send' || value.reason === 'chat.read') &&
    typeof value.updatedAt === 'string' &&
    (lastMessage === null || isChatMessagePayload(lastMessage))
  );
};

const chatSubscribers = new Map<number, ChatRealtimeSubscriber>();
let chatSubscriberSequence = 0;
let sharedSocket: WebSocket | null = null;
let sharedReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let sharedPingInterval: ReturnType<typeof setInterval> | null = null;
let sharedReconnectAttempts = 0;
let sharedShouldReconnect = false;
let sharedToken: string | null = null;
let sharedUserId: string | null = null;
let sharedWebsocketBaseUrl: string | null = null;
let sharedIsConnected = false;
let sharedWebsocketSource: 'explicit' | 'missing' = 'missing';

const getSocketReadyStateLabel = (readyState?: number | null): string => {
  switch (readyState) {
    case 0:
      return 'CONNECTING';
    case 1:
      return 'OPEN';
    case 2:
      return 'CLOSING';
    case 3:
      return 'CLOSED';
    default:
      return 'UNAVAILABLE';
  }
};

const hasEnabledSubscribers = (): boolean => {
  return Array.from(chatSubscribers.values()).some((subscriber) => subscriber.enabled);
};

const setSharedConnected = (connected: boolean) => {
  if (sharedIsConnected === connected) {
    return;
  }

  sharedIsConnected = connected;
  chatSubscribers.forEach((subscriber) => {
    subscriber.setConnected(connected);
  });
};

const clearSharedPing = () => {
  if (sharedPingInterval) {
    clearInterval(sharedPingInterval);
    sharedPingInterval = null;
  }
};

const clearSharedReconnectTimeout = () => {
  if (sharedReconnectTimeout) {
    clearTimeout(sharedReconnectTimeout);
    sharedReconnectTimeout = null;
  }
};

const closeSharedSocket = (reason: string) => {
  if (sharedSocket) {
    logger.info('Closing shared chat websocket', {
      reason,
      readyState: sharedSocket.readyState,
      readyStateLabel: getSocketReadyStateLabel(sharedSocket.readyState),
    });
    sharedSocket.close();
    sharedSocket = null;
  }
};

const resetSharedConnectionState = () => {
  clearSharedReconnectTimeout();
  clearSharedPing();
  sharedReconnectAttempts = 0;
  sharedShouldReconnect = false;
  sharedToken = null;
  sharedUserId = null;
  sharedWebsocketBaseUrl = null;
  setSharedConnected(false);
  closeSharedSocket('reset-shared-connection-state');
};

const dispatchMessageToSubscribers = (
  type: 'chat.message' | 'chat.read' | 'chat.conversation.updated',
  payload: unknown,
) => {
  chatSubscribers.forEach((subscriber) => {
    if (!subscriber.enabled) {
      return;
    }

    if (type === 'chat.message' && isChatMessagePayload(payload)) {
      subscriber.onChatMessage?.(payload);
      return;
    }

    if (type === 'chat.read' && isChatReadPayload(payload)) {
      subscriber.onChatRead?.(payload);
      return;
    }

    if (type === 'chat.conversation.updated' && isChatConversationUpdatedPayload(payload)) {
      subscriber.onChatConversationUpdated?.(payload);
    }
  });
};

const connectSharedSocket = () => {
  if (!sharedShouldReconnect || !sharedToken || !sharedWebsocketBaseUrl || !hasEnabledSubscribers()) {
    return;
  }

  clearSharedReconnectTimeout();
  clearSharedPing();

  const socketUrl = addTokenToWebSocketUrl(sharedWebsocketBaseUrl, sharedToken);
  const socket = new WebSocket(socketUrl);
  sharedSocket = socket;

  socket.onopen = () => {
    sharedReconnectAttempts = 0;
    setSharedConnected(true);
    logger.info('WebSocket connected for chat', {
      websocketBaseUrl: sharedWebsocketBaseUrl,
      websocketSource: sharedWebsocketSource,
    });

    sharedPingInterval = setInterval(() => {
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

    if (parsed.type === 'chat.message' || parsed.type === 'chat.read' || parsed.type === 'chat.conversation.updated') {
      dispatchMessageToSubscribers(parsed.type, parsed.payload);
    }
  };

  socket.onerror = (event) => {
    logger.warn('Chat websocket error', event);
  };

  socket.onclose = (event) => {
    if (sharedSocket !== socket) {
      return;
    }

    sharedSocket = null;

    clearSharedPing();
    setSharedConnected(false);

    if (!sharedShouldReconnect || !sharedToken || !sharedWebsocketBaseUrl || !hasEnabledSubscribers()) {
      return;
    }

    const reconnectDelay = computeReconnectDelay(sharedReconnectAttempts);
    sharedReconnectAttempts += 1;

    logger.warn('Chat websocket disconnected, scheduling reconnect', {
      code: event.code,
      reason: event.reason || 'no reason',
      reconnectDelayMs: reconnectDelay,
      websocketSource: sharedWebsocketSource,
      websocketBaseUrl: sharedWebsocketBaseUrl,
    });

    sharedReconnectTimeout = setTimeout(() => {
      connectSharedSocket();
    }, reconnectDelay);
  };
};

const refreshSharedConnection = (
  token: string | null | undefined,
  userId: string | null | undefined,
  websocketBaseUrl: string | null,
  websocketSource: 'explicit' | 'missing',
) => {
  sharedWebsocketSource = websocketSource;

  if (!websocketBaseUrl || !hasEnabledSubscribers() || !userId) {
    logger.warn('Chat websocket prerequisites missing; connection not started', {
      enabledSubscriberCount: Array.from(chatSubscribers.values()).filter((subscriber) => subscriber.enabled).length,
      hasToken: Boolean(token),
      hasUserId: Boolean(userId),
      hasWebsocketBaseUrl: Boolean(websocketBaseUrl),
      websocketSource,
    });
    resetSharedConnectionState();
    return;
  }

  if (!token) {
    logger.warn('Chat websocket token missing; deferring connection refresh', {
      userId,
      hasSocket: Boolean(sharedSocket),
      readyState: sharedSocket?.readyState ?? null,
    });
    sharedUserId = userId;
    if (!sharedSocket) {
      sharedShouldReconnect = false;
      setSharedConnected(false);
    }
    return;
  }

  const connectionIdentityChanged = userId !== sharedUserId || websocketBaseUrl !== sharedWebsocketBaseUrl;
  sharedToken = token;
  sharedUserId = userId;
  sharedWebsocketBaseUrl = websocketBaseUrl;
  sharedShouldReconnect = true;

  if (connectionIdentityChanged) {
    clearSharedReconnectTimeout();
    clearSharedPing();
    sharedReconnectAttempts = 0;
    setSharedConnected(false);
    closeSharedSocket('connection-identity-changed');
  }

  if (!sharedSocket || sharedSocket.readyState === WebSocket.CLOSING || sharedSocket.readyState === WebSocket.CLOSED) {
    connectSharedSocket();
  }
};

const removeSubscriber = (subscriberId: number) => {
  chatSubscribers.delete(subscriberId);

  if (!hasEnabledSubscribers()) {
    resetSharedConnectionState();
  }
};

const sendSharedAction = (payload: Record<string, unknown>) => {
  if (!sharedSocket || sharedSocket.readyState !== WebSocket.OPEN) {
    logger.warn('Skipped websocket action because chat socket is not open', {
      action: typeof payload.action === 'string' ? payload.action : 'unknown',
      hasSocket: Boolean(sharedSocket),
      readyState: sharedSocket?.readyState ?? null,
      readyStateLabel: getSocketReadyStateLabel(sharedSocket?.readyState),
      hasToken: Boolean(sharedToken),
      hasWebsocketBaseUrl: Boolean(sharedWebsocketBaseUrl),
      shouldReconnect: sharedShouldReconnect,
      websocketSource: sharedWebsocketSource,
      websocketBaseUrl: sharedWebsocketBaseUrl,
    });

    if (
      sharedShouldReconnect &&
      sharedToken &&
      sharedWebsocketBaseUrl &&
      (!sharedSocket || sharedSocket.readyState === WebSocket.CLOSING || sharedSocket.readyState === WebSocket.CLOSED)
    ) {
      connectSharedSocket();
    }

    return false;
  }

  try {
    sharedSocket.send(JSON.stringify(payload));
    return true;
  } catch (error) {
    logger.warn('Failed to send websocket action', error);
    return false;
  }
};

export function useChatRealtime(options: UseChatRealtimeOptions = {}) {
  const { enabled = true, onChatMessage, onChatRead, onChatConversationUpdated } = options;
  const { data: session } = useSession();
  const token = session?.user?.token;
  const userId = session?.user?.userId;
  const websocketBaseUrl = useMemo(() => normalizeWebSocketBaseUrl(WEBSOCKET_URL), []);
  const websocketSource = websocketBaseUrl ? 'explicit' : 'missing';

  const subscriberIdRef = useRef<number | null>(null);
  const onChatMessageRef = useRef<typeof onChatMessage>(onChatMessage);
  const onChatReadRef = useRef<typeof onChatRead>(onChatRead);
  const onChatConversationUpdatedRef = useRef<typeof onChatConversationUpdated>(onChatConversationUpdated);
  const [isConnected, setIsConnected] = useState(sharedIsConnected);

  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
    onChatReadRef.current = onChatRead;
    onChatConversationUpdatedRef.current = onChatConversationUpdated;

    if (!subscriberIdRef.current) {
      return;
    }

    const existingSubscriber = chatSubscribers.get(subscriberIdRef.current);
    if (!existingSubscriber) {
      return;
    }

    existingSubscriber.onChatMessage = onChatMessage;
    existingSubscriber.onChatRead = onChatRead;
    existingSubscriber.onChatConversationUpdated = onChatConversationUpdated;
  }, [onChatConversationUpdated, onChatMessage, onChatRead]);

  useEffect(() => {
    const subscriberId = ++chatSubscriberSequence;
    subscriberIdRef.current = subscriberId;

    chatSubscribers.set(subscriberId, {
      enabled,
      setConnected: setIsConnected,
      onChatMessage: onChatMessageRef.current,
      onChatRead: onChatReadRef.current,
      onChatConversationUpdated: onChatConversationUpdatedRef.current,
    });

    setIsConnected(sharedIsConnected);
    refreshSharedConnection(token, userId, websocketBaseUrl, websocketSource);

    return () => {
      removeSubscriber(subscriberId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!subscriberIdRef.current) {
      return;
    }

    const existingSubscriber = chatSubscribers.get(subscriberIdRef.current);
    if (!existingSubscriber) {
      return;
    }

    existingSubscriber.enabled = enabled;
    refreshSharedConnection(token, userId, websocketBaseUrl, websocketSource);
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
    return sendSharedAction({
      action: 'chat.send',
      recipientUserId,
      message,
    });
  }, []);

  const markConversationRead = useCallback((withUserId: string) => {
    return sendSharedAction({
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
