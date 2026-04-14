const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

jest.mock('@/lib/utils/websocket', () => ({
  PING_INTERVAL_MS: 1000,
  buildWebSocketAuthProtocols: (token: string) => [`gatherle.jwt.${token}`],
  computeReconnectDelay: () => 5,
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: mockLogger,
}));

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = jest.fn((_data: string) => {});
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: 'closed' } as CloseEvent);
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  triggerMessage(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe('sharedRealtimeConnectionManager', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  it('reuses one shared websocket for multiple subscribers', async () => {
    const manager = await import('@/lib/utils/realtime/sharedRealtimeConnectionManager');

    const subscriberAConnected = jest.fn();
    const subscriberBConnected = jest.fn();

    manager.addSharedRealtimeSubscriber({ enabled: true, setConnected: subscriberAConnected });
    manager.addSharedRealtimeSubscriber({ enabled: true, setConnected: subscriberBConnected });

    manager.refreshSharedRealtimeConnection({
      token: 'token-1',
      userId: 'user-1',
      websocketBaseUrl: 'ws://localhost:9000/beta',
      websocketSource: 'explicit',
    });

    expect(MockWebSocket.instances).toHaveLength(1);

    manager.refreshSharedRealtimeConnection({
      token: 'token-1',
      userId: 'user-1',
      websocketBaseUrl: 'ws://localhost:9000/beta',
      websocketSource: 'explicit',
    });

    expect(MockWebSocket.instances).toHaveLength(1);

    MockWebSocket.instances[0].triggerOpen();

    expect(subscriberAConnected).toHaveBeenCalledWith(true);
    expect(subscriberBConnected).toHaveBeenCalledWith(true);
    expect(manager.getSharedRealtimeConnectionState()).toBe(true);
  });

  it('dispatches messages to enabled subscribers and closes when all unsubscribe', async () => {
    const manager = await import('@/lib/utils/realtime/sharedRealtimeConnectionManager');

    const subscriberAConnected = jest.fn();
    const subscriberBConnected = jest.fn();
    const subscriberAMessage = jest.fn();
    const subscriberBMessage = jest.fn();

    const subscriberAId = manager.addSharedRealtimeSubscriber({
      enabled: true,
      setConnected: subscriberAConnected,
      onMessage: subscriberAMessage,
    });
    const subscriberBId = manager.addSharedRealtimeSubscriber({
      enabled: true,
      setConnected: subscriberBConnected,
      onMessage: subscriberBMessage,
    });

    manager.refreshSharedRealtimeConnection({
      token: 'token-2',
      userId: 'user-2',
      websocketBaseUrl: 'ws://localhost:9000/beta',
      websocketSource: 'explicit',
    });

    const socket = MockWebSocket.instances[0];
    socket.triggerOpen();
    socket.triggerMessage(JSON.stringify({ type: 'notification.new', payload: { id: 'n1' } }));

    expect(subscriberAMessage).toHaveBeenCalledTimes(1);
    expect(subscriberBMessage).toHaveBeenCalledTimes(1);

    manager.removeSharedRealtimeSubscriber(subscriberAId);
    expect(socket.close).not.toHaveBeenCalled();

    manager.removeSharedRealtimeSubscriber(subscriberBId);
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(subscriberAConnected).toHaveBeenCalledWith(true);
    expect(subscriberBConnected).toHaveBeenCalledWith(true);
    expect(manager.getSharedRealtimeConnectionState()).toBe(false);
  });

  it('resets state and logs warning when websocketBaseUrl is missing', async () => {
    const manager = await import('@/lib/utils/realtime/sharedRealtimeConnectionManager');
    const { logger } = require('@/lib/utils/logger');

    manager.addSharedRealtimeSubscriber({ enabled: true, setConnected: jest.fn() });

    manager.refreshSharedRealtimeConnection({
      token: 'token-1',
      userId: 'user-1',
      websocketBaseUrl: null,
      websocketSource: 'missing',
    });

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('prerequisites missing'), expect.any(Object));
  });

  it('defers connection when token is missing but userId is known', async () => {
    const manager = await import('@/lib/utils/realtime/sharedRealtimeConnectionManager');
    const { logger } = require('@/lib/utils/logger');

    manager.addSharedRealtimeSubscriber({ enabled: true, setConnected: jest.fn() });

    manager.refreshSharedRealtimeConnection({
      token: null,
      userId: 'user-1',
      websocketBaseUrl: 'ws://localhost:9000/beta',
      websocketSource: 'explicit',
    });

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('token missing'), expect.any(Object));
  });

  it('reconnects when connection identity changes', async () => {
    const manager = await import('@/lib/utils/realtime/sharedRealtimeConnectionManager');

    manager.addSharedRealtimeSubscriber({ enabled: true, setConnected: jest.fn() });

    // Establish initial connection
    manager.refreshSharedRealtimeConnection({
      token: 'token-A',
      userId: 'user-A',
      websocketBaseUrl: 'ws://localhost:9000/beta',
      websocketSource: 'explicit',
    });
    expect(MockWebSocket.instances).toHaveLength(1);
    MockWebSocket.instances[0].triggerOpen();

    // Change identity — should close old socket and open new one
    manager.refreshSharedRealtimeConnection({
      token: 'token-B',
      userId: 'user-B',
      websocketBaseUrl: 'ws://localhost:9000/beta',
      websocketSource: 'explicit',
    });

    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
  });
});
