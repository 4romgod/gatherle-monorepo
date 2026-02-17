import { logger } from '@/lib/utils/logger';
import { addTokenToWebSocketUrl, computeReconnectDelay, PING_INTERVAL_MS } from '@/lib/utils/websocket';
import type { SharedRealtimeSubscriberStore } from './subscriberStore';
import type { RealtimeWebsocketSource } from './types';

export interface RealtimeConnectionRuntime {
  socket: WebSocket | null;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  pingInterval: ReturnType<typeof setInterval> | null;
  reconnectAttempts: number;
  shouldReconnect: boolean;
  token: string | null;
  userId: string | null;
  websocketBaseUrl: string | null;
  websocketSource: RealtimeWebsocketSource;
}

export const createRealtimeConnectionRuntime = (): RealtimeConnectionRuntime => ({
  socket: null,
  reconnectTimeout: null,
  pingInterval: null,
  reconnectAttempts: 0,
  shouldReconnect: false,
  token: null,
  userId: null,
  websocketBaseUrl: null,
  websocketSource: 'missing',
});

export const getSocketReadyStateLabel = (readyState?: number | null): string => {
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

export const clearPing = (runtime: RealtimeConnectionRuntime) => {
  if (runtime.pingInterval) {
    clearInterval(runtime.pingInterval);
    runtime.pingInterval = null;
  }
};

export const clearReconnectTimeout = (runtime: RealtimeConnectionRuntime) => {
  if (runtime.reconnectTimeout) {
    clearTimeout(runtime.reconnectTimeout);
    runtime.reconnectTimeout = null;
  }
};

export const closeSocket = (runtime: RealtimeConnectionRuntime, reason: string) => {
  if (!runtime.socket) {
    return;
  }

  logger.info('Closing shared realtime websocket', {
    reason,
    readyState: runtime.socket.readyState,
    readyStateLabel: getSocketReadyStateLabel(runtime.socket.readyState),
  });
  runtime.socket.close();
  runtime.socket = null;
};

const notifyEnabledSubscribers = (
  subscriberStore: SharedRealtimeSubscriberStore,
  callbackName: 'onOpen' | 'onClose' | 'onError',
  callbackArg?: CloseEvent | Event,
) => {
  subscriberStore.forEachEnabled((subscriber) => {
    try {
      if (callbackName === 'onOpen') {
        subscriber.onOpen?.();
        return;
      }

      if (callbackName === 'onClose' && callbackArg) {
        subscriber.onClose?.(callbackArg as CloseEvent);
        return;
      }

      if (callbackName === 'onError' && callbackArg) {
        subscriber.onError?.(callbackArg as Event);
      }
    } catch (error) {
      logger.warn(`Realtime subscriber ${callbackName} callback failed`, error);
    }
  });
};

export const connectSocket = (runtime: RealtimeConnectionRuntime, subscriberStore: SharedRealtimeSubscriberStore) => {
  if (
    !runtime.shouldReconnect ||
    !runtime.token ||
    !runtime.websocketBaseUrl ||
    !subscriberStore.hasEnabledSubscribers()
  ) {
    return;
  }

  if (
    runtime.socket &&
    (runtime.socket.readyState === WebSocket.OPEN || runtime.socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  clearReconnectTimeout(runtime);
  clearPing(runtime);

  const socketUrl = addTokenToWebSocketUrl(runtime.websocketBaseUrl, runtime.token);
  const socket = new WebSocket(socketUrl);
  runtime.socket = socket;

  socket.onopen = () => {
    if (runtime.socket !== socket) {
      socket.close();
      return;
    }

    runtime.reconnectAttempts = 0;
    subscriberStore.setConnected(true);
    logger.info('Shared websocket connected', {
      websocketBaseUrl: runtime.websocketBaseUrl,
      websocketSource: runtime.websocketSource,
    });

    notifyEnabledSubscribers(subscriberStore, 'onOpen');

    runtime.pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'ping' }));
      }
    }, PING_INTERVAL_MS);
  };

  socket.onmessage = (event) => {
    if (typeof event.data === 'string') {
      subscriberStore.dispatchMessage(event.data);
    }
  };

  socket.onerror = (event) => {
    if (runtime.socket !== socket) {
      return;
    }

    logger.warn('Shared websocket error', event);
    notifyEnabledSubscribers(subscriberStore, 'onError', event);
  };

  socket.onclose = (event) => {
    if (runtime.socket !== socket) {
      return;
    }

    runtime.socket = null;
    clearPing(runtime);
    subscriberStore.setConnected(false);
    notifyEnabledSubscribers(subscriberStore, 'onClose', event);

    if (
      !runtime.shouldReconnect ||
      !runtime.token ||
      !runtime.websocketBaseUrl ||
      !subscriberStore.hasEnabledSubscribers()
    ) {
      return;
    }

    const reconnectDelay = computeReconnectDelay(runtime.reconnectAttempts);
    runtime.reconnectAttempts += 1;

    logger.warn('Shared websocket disconnected, scheduling reconnect', {
      code: event.code,
      reason: event.reason || 'no reason',
      reconnectDelayMs: reconnectDelay,
      websocketSource: runtime.websocketSource,
      websocketBaseUrl: runtime.websocketBaseUrl,
    });

    runtime.reconnectTimeout = setTimeout(() => {
      connectSocket(runtime, subscriberStore);
    }, reconnectDelay);
  };
};

export const sendSocketAction = (
  runtime: RealtimeConnectionRuntime,
  payload: Record<string, unknown>,
  reconnect: () => void,
) => {
  if (!runtime.socket || runtime.socket.readyState !== WebSocket.OPEN) {
    logger.warn('Skipped websocket action because shared socket is not open', {
      action: typeof payload.action === 'string' ? payload.action : 'unknown',
      hasSocket: Boolean(runtime.socket),
      readyState: runtime.socket?.readyState ?? null,
      readyStateLabel: getSocketReadyStateLabel(runtime.socket?.readyState),
      hasToken: Boolean(runtime.token),
      hasWebsocketBaseUrl: Boolean(runtime.websocketBaseUrl),
      shouldReconnect: runtime.shouldReconnect,
      websocketSource: runtime.websocketSource,
      websocketBaseUrl: runtime.websocketBaseUrl,
    });

    if (
      runtime.shouldReconnect &&
      runtime.token &&
      runtime.websocketBaseUrl &&
      (!runtime.socket ||
        runtime.socket.readyState === WebSocket.CLOSING ||
        runtime.socket.readyState === WebSocket.CLOSED)
    ) {
      reconnect();
    }

    return false;
  }

  try {
    runtime.socket.send(JSON.stringify(payload));
    return true;
  } catch (error) {
    logger.warn('Failed to send websocket action', error);
    return false;
  }
};
