import { buildWebSocketAuthProtocols, computeReconnectDelay, PING_INTERVAL_MS } from './websocket';
import type { RealtimeCloseEvent, RealtimeWebsocketSource } from './types';
import type { SharedRealtimeSubscriberStore } from './subscriberStore';

export interface RealtimeConnectionRuntime {
  deviceInstallationId: string | null;
  pingInterval: ReturnType<typeof setInterval> | null;
  reconnectAttempts: number;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  shouldReconnect: boolean;
  socket: WebSocket | null;
  token: string | null;
  userId: string | null;
  websocketBaseUrl: string | null;
  websocketSource: RealtimeWebsocketSource;
}

export const createRealtimeConnectionRuntime = (): RealtimeConnectionRuntime => ({
  deviceInstallationId: null,
  pingInterval: null,
  reconnectAttempts: 0,
  reconnectTimeout: null,
  shouldReconnect: false,
  socket: null,
  token: null,
  userId: null,
  websocketBaseUrl: null,
  websocketSource: 'missing',
});

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

export const closeSocket = (runtime: RealtimeConnectionRuntime) => {
  if (!runtime.socket) {
    return;
  }

  runtime.socket.close();
  runtime.socket = null;
};

const notifyEnabledSubscribers = (
  subscriberStore: SharedRealtimeSubscriberStore,
  callbackName: 'onOpen' | 'onClose' | 'onError',
  callbackArg?: RealtimeCloseEvent | unknown,
) => {
  subscriberStore.forEachEnabled((subscriber) => {
    try {
      if (callbackName === 'onOpen') {
        subscriber.onOpen?.();
        return;
      }

      if (callbackName === 'onClose') {
        subscriber.onClose?.((callbackArg as RealtimeCloseEvent | undefined) ?? {});
        return;
      }

      subscriber.onError?.(callbackArg);
    } catch {
      // Ignore subscriber callback failures to keep the shared socket healthy.
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

  const socket = new WebSocket(
    runtime.websocketBaseUrl,
    buildWebSocketAuthProtocols(runtime.token, runtime.deviceInstallationId),
  );
  runtime.socket = socket;

  socket.onopen = () => {
    if (runtime.socket !== socket) {
      socket.close();
      return;
    }

    runtime.reconnectAttempts = 0;
    subscriberStore.setConnected(true);
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

    notifyEnabledSubscribers(subscriberStore, 'onError', event);
  };

  socket.onclose = (event) => {
    if (runtime.socket !== socket) {
      return;
    }

    runtime.socket = null;
    clearPing(runtime);
    subscriberStore.setConnected(false);
    notifyEnabledSubscribers(subscriberStore, 'onClose', {
      code: event.code,
      reason: event.reason,
    });

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
  } catch {
    return false;
  }
};
