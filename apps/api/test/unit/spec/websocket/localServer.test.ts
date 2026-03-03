import { WEBSOCKET_AUTH_PROTOCOL_PREFIX } from '@/websocket/constants';
import { selectWebSocketProtocol } from '@/websocket/localServer';

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  initLogger: jest.fn(),
}));

jest.mock('@/websocket/lambdaHandler', () => ({
  websocketLambdaHandler: jest.fn(),
}));

jest.mock('@/websocket/localGateway', () => ({
  LOCAL_WEBSOCKET_DOMAIN_NAME: 'localhost',
  registerLocalConnection: jest.fn(),
  unregisterLocalConnection: jest.fn(),
}));

const AUTH_PROTOCOL = `${WEBSOCKET_AUTH_PROTOCOL_PREFIX}test-token`;

describe('selectWebSocketProtocol', () => {
  it('returns the auth protocol when it is the only protocol', () => {
    expect(selectWebSocketProtocol(new Set([AUTH_PROTOCOL]))).toBe(AUTH_PROTOCOL);
  });

  it('returns the auth protocol when mixed with other protocols', () => {
    expect(selectWebSocketProtocol(new Set(['graphql-ws', AUTH_PROTOCOL, 'chat']))).toBe(AUTH_PROTOCOL);
  });

  it('returns false when no protocol matches the auth prefix', () => {
    expect(selectWebSocketProtocol(new Set(['graphql-ws', 'chat']))).toBe(false);
  });

  it('returns false when the protocol set is empty', () => {
    expect(selectWebSocketProtocol(new Set())).toBe(false);
  });

  it('does not match a protocol that only partially starts with the prefix', () => {
    const partial = WEBSOCKET_AUTH_PROTOCOL_PREFIX.slice(0, -1);
    expect(selectWebSocketProtocol(new Set([partial]))).toBe(false);
  });

  it('returns false for the bare prefix with no token suffix', () => {
    expect(selectWebSocketProtocol(new Set([WEBSOCKET_AUTH_PROTOCOL_PREFIX]))).toBe(false);
  });

  it('returns false for the bare prefix with only whitespace as a suffix', () => {
    expect(selectWebSocketProtocol(new Set([`${WEBSOCKET_AUTH_PROTOCOL_PREFIX}   `]))).toBe(false);
  });
});
