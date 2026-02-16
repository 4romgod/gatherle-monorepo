import { addTokenToWebSocketUrl, computeReconnectDelay, logger, PING_INTERVAL_MS } from '@/lib/utils';
import {
  isChatConversationUpdatedPayload,
  isChatMessagePayload,
  isChatReadPayload,
  parseChatRealtimeEvent,
  type ChatConversationUpdatedRealtimePayload,
  type ChatMessageRealtimePayload,
  type ChatReadRealtimePayload,
} from './chatRealtimeProtocol';

export type ChatWebsocketSource = 'explicit' | 'missing';

interface ChatRealtimeSubscriber {
  enabled: boolean;
  setConnected: (connected: boolean) => void;
  onChatMessage?: (payload: ChatMessageRealtimePayload) => void;
  onChatRead?: (payload: ChatReadRealtimePayload) => void;
  onChatConversationUpdated?: (payload: ChatConversationUpdatedRealtimePayload) => void;
}

interface RefreshSharedConnectionParams {
  token: string | null | undefined;
  userId: string | null | undefined;
  websocketBaseUrl: string | null;
  websocketSource: ChatWebsocketSource;
}

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
let sharedWebsocketSource: ChatWebsocketSource = 'missing';

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

  if (
    sharedSocket &&
    (sharedSocket.readyState === WebSocket.OPEN || sharedSocket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  clearSharedReconnectTimeout();
  clearSharedPing();

  const socketUrl = addTokenToWebSocketUrl(sharedWebsocketBaseUrl, sharedToken);
  const socket = new WebSocket(socketUrl);
  sharedSocket = socket;

  socket.onopen = () => {
    if (sharedSocket !== socket) {
      socket.close();
      return;
    }

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

    const realtimeEvent = parseChatRealtimeEvent(event.data);
    if (!realtimeEvent) {
      return;
    }

    dispatchMessageToSubscribers(realtimeEvent.type, realtimeEvent.payload);
  };

  socket.onerror = (event) => {
    if (sharedSocket !== socket) {
      return;
    }
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

export const getChatRealtimeConnectionState = (): boolean => {
  return sharedIsConnected;
};

export const addChatRealtimeSubscriber = (subscriber: ChatRealtimeSubscriber): number => {
  const subscriberId = ++chatSubscriberSequence;
  chatSubscribers.set(subscriberId, subscriber);
  return subscriberId;
};

export const updateChatRealtimeSubscriber = (
  subscriberId: number,
  updates: Partial<Omit<ChatRealtimeSubscriber, 'setConnected'>>,
) => {
  const existingSubscriber = chatSubscribers.get(subscriberId);
  if (!existingSubscriber) {
    return;
  }

  if (typeof updates.enabled === 'boolean') {
    existingSubscriber.enabled = updates.enabled;
  }

  if (Object.hasOwn(updates, 'onChatMessage')) {
    existingSubscriber.onChatMessage = updates.onChatMessage;
  }

  if (Object.hasOwn(updates, 'onChatRead')) {
    existingSubscriber.onChatRead = updates.onChatRead;
  }

  if (Object.hasOwn(updates, 'onChatConversationUpdated')) {
    existingSubscriber.onChatConversationUpdated = updates.onChatConversationUpdated;
  }
};

export const removeChatRealtimeSubscriber = (subscriberId: number) => {
  chatSubscribers.delete(subscriberId);

  if (!hasEnabledSubscribers()) {
    resetSharedConnectionState();
  }
};

export const refreshSharedConnection = ({
  token,
  userId,
  websocketBaseUrl,
  websocketSource,
}: RefreshSharedConnectionParams) => {
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

export const sendSharedAction = (payload: Record<string, unknown>) => {
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
