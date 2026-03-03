import type { WebSocketRequestEvent } from '@/websocket/types';
import { extractToken, getHeader } from '@/websocket/event';

const createWebSocketEvent = (
  overrides: Partial<WebSocketRequestEvent> = {},
  headers: Record<string, string | undefined> = {},
): WebSocketRequestEvent => {
  return {
    requestContext: {
      routeKey: '$connect',
      eventType: 'CONNECT',
      connectionId: 'connection-id',
      domainName: 'example.com',
      stage: 'beta',
      apiId: 'api-id',
      requestId: 'request-id',
      requestTime: 'now',
      requestTimeEpoch: Date.now(),
      connectedAt: Date.now(),
    },
    headers,
    ...overrides,
  } as WebSocketRequestEvent;
};

describe('websocket event token extraction', () => {
  it('extracts token from Sec-WebSocket-Protocol header', () => {
    const event = createWebSocketEvent({}, { 'sec-websocket-protocol': 'gatherle.jwt.abc.def.ghi' });

    expect(extractToken(event)).toBe('abc.def.ghi');
  });

  it('extracts token from comma-separated Sec-WebSocket-Protocol values', () => {
    const event = createWebSocketEvent(
      {},
      { 'sec-websocket-protocol': 'graphql-ws, gatherle.jwt.abc.def.ghi, chat.v1' },
    );

    expect(extractToken(event)).toBe('abc.def.ghi');
  });

  it('extracts token from non-standard-cased Sec-WebSocket-Protocol header', () => {
    const event = createWebSocketEvent({}, { 'SEC-WEBSOCKET-PROTOCOL': 'gatherle.jwt.abc.def.ghi' });

    expect(extractToken(event)).toBe('abc.def.ghi');
  });

  it('ignores Authorization header — WebSocket auth is protocol-header only', () => {
    const event = createWebSocketEvent({}, { authorization: 'Bearer abc.def.ghi' });

    expect(extractToken(event)).toBeUndefined();
  });

  it('ignores Authorization header even when Sec-WebSocket-Protocol is also present', () => {
    const event = createWebSocketEvent(
      {},
      {
        authorization: 'Bearer from-auth-header',
        'sec-websocket-protocol': 'gatherle.jwt.from-protocol-header',
      },
    );

    expect(extractToken(event)).toBe('from-protocol-header');
  });

  it('does not fall back to query string parameters', () => {
    const event = createWebSocketEvent({ queryStringParameters: { token: 'from-query-param' } });

    expect(extractToken(event)).toBeUndefined();
  });

  it('returns undefined for protocol header with prefix but no token', () => {
    const event = createWebSocketEvent({}, { 'sec-websocket-protocol': 'gatherle.jwt.' });

    expect(extractToken(event)).toBeUndefined();
  });

  it('returns undefined for protocol header with prefix and whitespace-only token', () => {
    const event = createWebSocketEvent({}, { 'sec-websocket-protocol': 'gatherle.jwt.   ' });

    expect(extractToken(event)).toBeUndefined();
  });
});

describe('getHeader', () => {
  it('returns the value for an exact-case match', () => {
    expect(getHeader({ 'sec-websocket-protocol': 'gatherle.jwt.tok' }, 'sec-websocket-protocol')).toBe(
      'gatherle.jwt.tok',
    );
  });

  it('returns the value for a mixed-case key lookup', () => {
    expect(getHeader({ 'Sec-WebSocket-Protocol': 'gatherle.jwt.tok' }, 'sec-websocket-protocol')).toBe(
      'gatherle.jwt.tok',
    );
  });

  it('returns the value when the stored key has non-standard casing', () => {
    expect(getHeader({ 'SEC-WEBSOCKET-PROTOCOL': 'gatherle.jwt.tok' }, 'sec-websocket-protocol')).toBe(
      'gatherle.jwt.tok',
    );
  });

  it('returns undefined when the header is absent', () => {
    expect(getHeader({ 'content-type': 'application/json' }, 'sec-websocket-protocol')).toBeUndefined();
  });

  it('returns undefined when headers are undefined', () => {
    expect(getHeader(undefined, 'sec-websocket-protocol')).toBeUndefined();
  });
});
