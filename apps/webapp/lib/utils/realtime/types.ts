export type RealtimeWebsocketSource = 'explicit' | 'missing';

export interface SharedRealtimeSubscriber {
  enabled: boolean;
  setConnected: (connected: boolean) => void;
  onMessage?: (data: string) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export type SharedRealtimeSubscriberUpdates = Partial<Omit<SharedRealtimeSubscriber, 'setConnected'>>;

export interface RefreshSharedRealtimeConnectionParams {
  token: string | null | undefined;
  userId: string | null | undefined;
  websocketBaseUrl: string | null;
  websocketSource: RealtimeWebsocketSource;
}
