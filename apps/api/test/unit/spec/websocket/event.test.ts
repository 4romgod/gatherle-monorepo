import type { WebSocketRequestEvent } from '@/websocket/types';
import { extractToken } from '@/websocket/event';

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
  it('extracts token from Authorization header', () => {
    const event = createWebSocketEvent({}, { authorization: 'Bearer abc.def.ghi' });

    expect(extractToken(event)).toBe('abc.def.ghi');
  });

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

  it('prefers Authorization token when both Authorization and protocol headers are present', () => {
    const event = createWebSocketEvent(
      {},
      {
        authorization: 'Bearer from-auth-header',
        'sec-websocket-protocol': 'gatherle.jwt.from-protocol-header',
      },
    );

    expect(extractToken(event)).toBe('from-auth-header');
  });

  it('does not fall back to query string parameters', () => {
    const event = createWebSocketEvent({
      queryStringParameters: { token: 'from-query-param' },
    });

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

  it('returns undefined for Bearer header with no token', () => {
    const event = createWebSocketEvent({}, { authorization: 'Bearer ' });

    expect(extractToken(event)).toBeUndefined();
  });

  it('returns undefined for Bearer header with whitespace-only token', () => {
    const event = createWebSocketEvent({}, { authorization: 'Bearer    ' });

    expect(extractToken(event)).toBeUndefined();
  });
});
