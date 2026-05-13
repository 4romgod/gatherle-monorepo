import {
  clearPing,
  clearReconnectTimeout,
  closeSocket,
  connectSocket,
  createRealtimeConnectionRuntime,
  sendSocketAction,
} from './connectionSocket';
import { SharedRealtimeSubscriberStore } from './subscriberStore';
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
  closeSocket(runtime);
};

export const addSharedRealtimeSubscriber = (subscriber: SharedRealtimeSubscriber): number => {
  return subscriberStore.add(subscriber);
};

export const getSharedRealtimeConnectionState = (): boolean => {
  return subscriberStore.isConnected();
};

export const refreshSharedRealtimeConnection = ({
  token,
  userId,
  websocketBaseUrl,
  websocketSource,
}: RefreshSharedRealtimeConnectionParams) => {
  runtime.websocketSource = websocketSource;

  if (!websocketBaseUrl || !subscriberStore.hasEnabledSubscribers() || !userId) {
    resetSharedConnectionState();
    return;
  }

  if (!token) {
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
    closeSocket(runtime);
  }

  if (
    !runtime.socket ||
    runtime.socket.readyState === WebSocket.CLOSING ||
    runtime.socket.readyState === WebSocket.CLOSED
  ) {
    connectSocket(runtime, subscriberStore);
  }
};

export const removeSharedRealtimeSubscriber = (subscriberId: number) => {
  subscriberStore.remove(subscriberId);

  if (!subscriberStore.hasEnabledSubscribers()) {
    resetSharedConnectionState();
  }
};

export const sendSharedRealtimeAction = (payload: Record<string, unknown>) => {
  return sendSocketAction(runtime, payload, () => connectSocket(runtime, subscriberStore));
};

export const updateSharedRealtimeSubscriber = (subscriberId: number, updates: SharedRealtimeSubscriberUpdates) => {
  subscriberStore.update(subscriberId, updates);
};

export type { RefreshSharedRealtimeConnectionParams, RealtimeWebsocketSource, SharedRealtimeSubscriber };
