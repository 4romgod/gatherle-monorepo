export type RealtimeCloseEvent = {
  code?: number;
  reason?: string;
};

export type RealtimeWebsocketSource = 'explicit' | 'derived-local' | 'derived-remote' | 'missing';

export interface SharedRealtimeSubscriber {
  enabled: boolean;
  onClose?: (event: RealtimeCloseEvent) => void;
  onError?: (event: unknown) => void;
  onMessage?: (data: string) => void;
  onOpen?: () => void;
  setConnected: (connected: boolean) => void;
}

export type SharedRealtimeSubscriberUpdates = Partial<Omit<SharedRealtimeSubscriber, 'setConnected'>>;

export interface RefreshSharedRealtimeConnectionParams {
  token: string | null | undefined;
  userId: string | null | undefined;
  websocketBaseUrl: string | null;
  websocketSource: RealtimeWebsocketSource;
}
