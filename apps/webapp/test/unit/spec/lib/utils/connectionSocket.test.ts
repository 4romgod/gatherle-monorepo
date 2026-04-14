import {
  closeSocket,
  clearPing,
  clearReconnectTimeout,
  connectSocket,
  createRealtimeConnectionRuntime,
  getSocketReadyStateLabel,
  sendSocketAction,
} from '@/lib/utils/realtime/connectionSocket';
import { SharedRealtimeSubscriberStore } from '@/lib/utils/realtime/subscriberStore';

jest.mock('@/lib/utils/websocket', () => ({
  PING_INTERVAL_MS: 1000,
  buildWebSocketAuthProtocols: (token: string) => [`gatherle.jwt.${token}`],
  computeReconnectDelay: jest.fn(() => 50),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readonly protocols: string | string[];
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols ?? [];
    MockWebSocket.instances.push(this);
  }

  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  triggerMessage(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }

  triggerError() {
    this.onerror?.(new Event('error'));
  }

  triggerClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason } as CloseEvent);
  }
}

describe('connectionSocket', () => {
  let mockLogger: ReturnType<typeof jest.fn> & { debug: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    mockLogger = require('@/lib/utils/logger').logger as typeof mockLogger;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getSocketReadyStateLabel', () => {
    it('returns correct labels for all known states', () => {
      expect(getSocketReadyStateLabel(0)).toBe('CONNECTING');
      expect(getSocketReadyStateLabel(1)).toBe('OPEN');
      expect(getSocketReadyStateLabel(2)).toBe('CLOSING');
      expect(getSocketReadyStateLabel(3)).toBe('CLOSED');
    });

    it('returns UNAVAILABLE for unknown or null state', () => {
      expect(getSocketReadyStateLabel(null)).toBe('UNAVAILABLE');
      expect(getSocketReadyStateLabel(undefined)).toBe('UNAVAILABLE');
      expect(getSocketReadyStateLabel(99)).toBe('UNAVAILABLE');
    });
  });

  describe('createRealtimeConnectionRuntime', () => {
    it('creates runtime with default values', () => {
      const runtime = createRealtimeConnectionRuntime();
      expect(runtime.socket).toBeNull();
      expect(runtime.reconnectTimeout).toBeNull();
      expect(runtime.pingInterval).toBeNull();
      expect(runtime.reconnectAttempts).toBe(0);
      expect(runtime.shouldReconnect).toBe(false);
      expect(runtime.token).toBeNull();
      expect(runtime.userId).toBeNull();
      expect(runtime.websocketBaseUrl).toBeNull();
      expect(runtime.websocketSource).toBe('missing');
    });
  });

  describe('clearPing', () => {
    it('clears the ping interval if set', () => {
      const runtime = createRealtimeConnectionRuntime();
      runtime.pingInterval = setInterval(() => {}, 10000) as ReturnType<typeof setInterval>;

      clearPing(runtime);

      expect(runtime.pingInterval).toBeNull();
    });

    it('does nothing when pingInterval is null', () => {
      const runtime = createRealtimeConnectionRuntime();
      expect(() => clearPing(runtime)).not.toThrow();
    });
  });

  describe('clearReconnectTimeout', () => {
    it('clears the reconnect timeout if set', () => {
      const runtime = createRealtimeConnectionRuntime();
      runtime.reconnectTimeout = setTimeout(() => {}, 5000) as ReturnType<typeof setTimeout>;

      clearReconnectTimeout(runtime);

      expect(runtime.reconnectTimeout).toBeNull();
    });

    it('does nothing when reconnectTimeout is null', () => {
      const runtime = createRealtimeConnectionRuntime();
      expect(() => clearReconnectTimeout(runtime)).not.toThrow();
    });
  });

  describe('closeSocket', () => {
    it('closes the socket and nulls it out', () => {
      const runtime = createRealtimeConnectionRuntime();
      const socket = new MockWebSocket('ws://localhost');
      socket.readyState = MockWebSocket.OPEN;
      runtime.socket = socket as unknown as WebSocket;

      closeSocket(runtime, 'test-reason');

      expect(socket.close).toHaveBeenCalled();
      expect(runtime.socket).toBeNull();
    });

    it('does nothing when socket is null', () => {
      const runtime = createRealtimeConnectionRuntime();
      expect(() => closeSocket(runtime, 'test')).not.toThrow();
    });

    it('logs info when closing socket', () => {
      const runtime = createRealtimeConnectionRuntime();
      const socket = new MockWebSocket('ws://localhost');
      socket.readyState = MockWebSocket.OPEN;
      runtime.socket = socket as unknown as WebSocket;

      closeSocket(runtime, 'reason-x');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Closing'),
        expect.objectContaining({ reason: 'reason-x' }),
      );
    });
  });

  describe('connectSocket', () => {
    const makeStore = () => {
      const store = new SharedRealtimeSubscriberStore();
      const setConnected = jest.fn();
      store.add({ enabled: true, setConnected });
      return { store, setConnected };
    };

    it('does not connect when shouldReconnect is false', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store } = makeStore();
      runtime.shouldReconnect = false;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);

      expect(MockWebSocket.instances).toHaveLength(0);
    });

    it('does not connect when token is missing', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store } = makeStore();
      runtime.shouldReconnect = true;
      runtime.token = null;
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);

      expect(MockWebSocket.instances).toHaveLength(0);
    });

    it('does not connect when no enabled subscribers', () => {
      const runtime = createRealtimeConnectionRuntime();
      const store = new SharedRealtimeSubscriberStore();
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);

      expect(MockWebSocket.instances).toHaveLength(0);
    });

    it('does not create a new socket if one is already OPEN', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store } = makeStore();
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);
      const socket = MockWebSocket.instances[0];
      socket.readyState = MockWebSocket.OPEN;
      runtime.socket = socket as unknown as WebSocket;

      connectSocket(runtime, store);

      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it('creates a WebSocket connection with auth protocols', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store } = makeStore();
      runtime.shouldReconnect = true;
      runtime.token = 'my-token';
      runtime.websocketBaseUrl = 'ws://localhost:9000/beta';

      connectSocket(runtime, store);

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:9000/beta');
      expect(MockWebSocket.instances[0].protocols).toContain('gatherle.jwt.my-token');
    });

    it('sets connected state and notifies onOpen when socket opens', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store, setConnected } = makeStore();
      const onOpen = jest.fn();
      store.add({ enabled: true, setConnected: jest.fn(), onOpen });
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);
      MockWebSocket.instances[0].triggerOpen();

      expect(setConnected).toHaveBeenCalledWith(true);
      expect(onOpen).toHaveBeenCalled();
      expect(runtime.reconnectAttempts).toBe(0);
    });

    it('starts ping interval after connection opens', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store } = makeStore();
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);
      MockWebSocket.instances[0].triggerOpen();

      expect(runtime.pingInterval).not.toBeNull();

      // Advance past ping interval
      jest.advanceTimersByTime(1100);
      expect(MockWebSocket.instances[0].send).toHaveBeenCalledWith(JSON.stringify({ action: 'ping' }));
    });

    it('dispatches incoming messages to subscribers', () => {
      const runtime = createRealtimeConnectionRuntime();
      const onMsg = jest.fn();
      const store = new SharedRealtimeSubscriberStore();
      store.add({ enabled: true, setConnected: jest.fn(), onMessage: onMsg });
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);
      MockWebSocket.instances[0].triggerOpen();
      MockWebSocket.instances[0].triggerMessage('{"type":"test"}');

      expect(onMsg).toHaveBeenCalledWith('{"type":"test"}');
    });

    it('handles onerror and notifies subscribers', () => {
      const runtime = createRealtimeConnectionRuntime();
      const onError = jest.fn();
      const store = new SharedRealtimeSubscriberStore();
      store.add({ enabled: true, setConnected: jest.fn(), onError });
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);
      const socket = MockWebSocket.instances[0];
      runtime.socket = socket as unknown as WebSocket;
      socket.triggerError();

      expect(onError).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('error'), expect.anything());
    });

    it('schedules reconnect on close when shouldReconnect is true', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store, setConnected } = makeStore();
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);
      const socket = MockWebSocket.instances[0];
      socket.triggerOpen();
      socket.triggerClose(1006, 'abnormal');

      expect(setConnected).toHaveBeenCalledWith(false);
      expect(runtime.reconnectTimeout).not.toBeNull();

      // Advance past reconnect delay
      jest.advanceTimersByTime(100);

      expect(MockWebSocket.instances).toHaveLength(2);
    });

    it('does not reconnect on close when shouldReconnect is false', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store } = makeStore();
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);
      const socket = MockWebSocket.instances[0];
      socket.triggerOpen();

      runtime.shouldReconnect = false;
      socket.triggerClose(1000, 'clean');

      jest.advanceTimersByTime(100);
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it('discards stale socket events (onopen from old socket)', () => {
      const runtime = createRealtimeConnectionRuntime();
      const { store, setConnected } = makeStore();
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      connectSocket(runtime, store);
      const oldSocket = MockWebSocket.instances[0];

      // Replace socket before old one opens
      runtime.socket = null;

      // Old socket fires open — should be discarded
      oldSocket.triggerOpen();

      expect(oldSocket.close).toHaveBeenCalled();
    });
  });

  describe('sendSocketAction', () => {
    it('returns false and logs when socket is not open', () => {
      const runtime = createRealtimeConnectionRuntime();
      const reconnect = jest.fn();

      const result = sendSocketAction(runtime, { action: 'test' }, reconnect);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('triggers reconnect when socket is closed and shouldReconnect is true', () => {
      const runtime = createRealtimeConnectionRuntime();
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      const socket = new MockWebSocket('ws://localhost:9000');
      socket.readyState = MockWebSocket.CLOSED;
      runtime.socket = socket as unknown as WebSocket;

      const reconnect = jest.fn();
      sendSocketAction(runtime, { action: 'test' }, reconnect);

      expect(reconnect).toHaveBeenCalled();
    });

    it('sends action and returns true when socket is open', () => {
      const runtime = createRealtimeConnectionRuntime();
      const socket = new MockWebSocket('ws://localhost:9000');
      socket.readyState = MockWebSocket.OPEN;
      runtime.socket = socket as unknown as WebSocket;
      runtime.shouldReconnect = true;
      runtime.token = 'tok';

      const reconnect = jest.fn();
      const result = sendSocketAction(runtime, { action: 'chat.send', message: 'hi' }, reconnect);

      expect(result).toBe(true);
      expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ action: 'chat.send', message: 'hi' }));
    });

    it('returns false and logs when send throws', () => {
      const runtime = createRealtimeConnectionRuntime();
      const socket = new MockWebSocket('ws://localhost:9000');
      socket.readyState = MockWebSocket.OPEN;
      socket.send.mockImplementationOnce(() => {
        throw new Error('send failed');
      });
      runtime.socket = socket as unknown as WebSocket;

      const reconnect = jest.fn();
      const result = sendSocketAction(runtime, { action: 'test' }, reconnect);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to send'), expect.any(Error));
    });

    it('does not trigger reconnect when socket is CONNECTING', () => {
      const runtime = createRealtimeConnectionRuntime();
      runtime.shouldReconnect = true;
      runtime.token = 'tok';
      runtime.websocketBaseUrl = 'ws://localhost:9000';

      const socket = new MockWebSocket('ws://localhost:9000');
      socket.readyState = MockWebSocket.CONNECTING;
      runtime.socket = socket as unknown as WebSocket;

      const reconnect = jest.fn();
      sendSocketAction(runtime, { action: 'test' }, reconnect);

      expect(reconnect).not.toHaveBeenCalled();
    });
  });
});
