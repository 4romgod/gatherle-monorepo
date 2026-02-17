import {
  clearPing,
  clearReconnectTimeout,
  closeSocket,
  connectSocket,
  createRealtimeConnectionRuntime,
  sendSocketAction,
} from './connectionSocket';
import { SharedRealtimeSubscriberStore } from './subscriberStore';
import { logger } from '@/lib/utils/logger';
import type {
  RefreshSharedRealtimeConnectionParams,
  RealtimeWebsocketSource,
  SharedRealtimeSubscriber,
  SharedRealtimeSubscriberUpdates,
} from './types';

const subscriberStore = new SharedRealtimeSubscriberStore();
const runtime = createRealtimeConnectionRuntime();

const resetSharedConnectionState = () => {
  clearReconnectTimeout(runtime);
  clearPing(runtime);
  runtime.reconnectAttempts = 0;
  runtime.shouldReconnect = false;
  runtime.token = null;
  runtime.userId = null;
  runtime.websocketBaseUrl = null;
  subscriberStore.setConnected(false);
  closeSocket(runtime, 'reset-shared-connection-state');
};

export const getSharedRealtimeConnectionState = (): boolean => {
  return subscriberStore.isConnected();
};

export const addSharedRealtimeSubscriber = (subscriber: SharedRealtimeSubscriber): number => {
  return subscriberStore.add(subscriber);
};

export const updateSharedRealtimeSubscriber = (subscriberId: number, updates: SharedRealtimeSubscriberUpdates) => {
  subscriberStore.update(subscriberId, updates);
};

export const removeSharedRealtimeSubscriber = (subscriberId: number) => {
  subscriberStore.remove(subscriberId);
  if (!subscriberStore.hasEnabledSubscribers()) {
    resetSharedConnectionState();
  }
};

export const refreshSharedRealtimeConnection = ({
  token,
  userId,
  websocketBaseUrl,
  websocketSource,
}: RefreshSharedRealtimeConnectionParams) => {
  runtime.websocketSource = websocketSource;

  if (!websocketBaseUrl || !subscriberStore.hasEnabledSubscribers() || !userId) {
    logger.warn('Shared websocket prerequisites missing; connection not started', {
      enabledSubscriberCount: subscriberStore.enabledCount(),
      hasToken: Boolean(token),
      hasUserId: Boolean(userId),
      hasWebsocketBaseUrl: Boolean(websocketBaseUrl),
      websocketSource,
    });
    resetSharedConnectionState();
    return;
  }

  if (!token) {
    logger.warn('Shared websocket token missing; deferring connection refresh', {
      userId,
      hasSocket: Boolean(runtime.socket),
      readyState: runtime.socket?.readyState ?? null,
    });
    runtime.userId = userId;
    if (!runtime.socket) {
      runtime.shouldReconnect = false;
      subscriberStore.setConnected(false);
    }
    return;
  }

  const connectionIdentityChanged = userId !== runtime.userId || websocketBaseUrl !== runtime.websocketBaseUrl;
  runtime.token = token;
  runtime.userId = userId;
  runtime.websocketBaseUrl = websocketBaseUrl;
  runtime.shouldReconnect = true;

  if (connectionIdentityChanged) {
    clearReconnectTimeout(runtime);
    clearPing(runtime);
    runtime.reconnectAttempts = 0;
    subscriberStore.setConnected(false);
    closeSocket(runtime, 'connection-identity-changed');
  }

  if (
    !runtime.socket ||
    runtime.socket.readyState === WebSocket.CLOSING ||
    runtime.socket.readyState === WebSocket.CLOSED
  ) {
    connectSocket(runtime, subscriberStore);
  }
};

export const sendSharedRealtimeAction = (payload: Record<string, unknown>) => {
  return sendSocketAction(runtime, payload, () => connectSocket(runtime, subscriberStore));
};

export type { RefreshSharedRealtimeConnectionParams, RealtimeWebsocketSource, SharedRealtimeSubscriber };
