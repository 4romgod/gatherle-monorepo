import {
  buildWebSocketAuthProtocols,
  normalizeWebSocketBaseUrl,
  resolveWebappWebsocketBaseUrl,
} from '@/lib/utils/websocket';

describe('websocket utils', () => {
  describe('normalizeWebSocketBaseUrl', () => {
    it('converts https to wss', () => {
      expect(normalizeWebSocketBaseUrl('https://example.com/beta')).toBe('wss://example.com/beta');
    });

    it('converts http to ws', () => {
      expect(normalizeWebSocketBaseUrl('http://localhost:3001/local')).toBe('ws://localhost:3001/local');
    });

    it('returns null for empty values', () => {
      expect(normalizeWebSocketBaseUrl('')).toBeNull();
      expect(normalizeWebSocketBaseUrl('   ')).toBeNull();
    });
  });

  describe('buildWebSocketAuthProtocols', () => {
    it('builds websocket auth protocol value from JWT token', () => {
      expect(buildWebSocketAuthProtocols('abc.def.ghi')).toEqual(['gatherle.jwt.abc.def.ghi']);
    });
  });

  describe('resolveWebappWebsocketBaseUrl', () => {
    it('prefers an explicit websocket URL when provided', () => {
      expect(resolveWebappWebsocketBaseUrl('wss://ws.example.com', 'https://api.example.com/graphql')).toEqual({
        websocketBaseUrl: 'wss://ws.example.com',
        websocketSource: 'explicit',
      });
    });

    it('upgrades explicit insecure remote websocket URLs under secure GraphQL environments', () => {
      expect(
        resolveWebappWebsocketBaseUrl(
          'ws://ws.beta.af-south-1.gatherle.com',
          'https://api.beta.af-south-1.gatherle.com/graphql',
        ),
      ).toEqual({
        websocketBaseUrl: 'wss://ws.beta.af-south-1.gatherle.com',
        websocketSource: 'explicit',
      });
    });

    it('derives the remote websocket URL from the GraphQL URL when explicit config is missing', () => {
      expect(resolveWebappWebsocketBaseUrl('', 'https://api.beta.af-south-1.gatherle.com/graphql')).toEqual({
        websocketBaseUrl: 'wss://ws.beta.af-south-1.gatherle.com',
        websocketSource: 'derived-remote',
      });
    });

    it('returns missing for unsupported remote GraphQL hosts when explicit config is absent', () => {
      expect(
        resolveWebappWebsocketBaseUrl('', 'https://abc123456.execute-api.af-south-1.amazonaws.com/beta/graphql'),
      ).toEqual({
        websocketBaseUrl: null,
        websocketSource: 'missing',
      });
    });

    it('derives the local websocket URL from the GraphQL URL when explicit config is missing', () => {
      expect(resolveWebappWebsocketBaseUrl('', 'http://localhost:9000/v1/graphql')).toEqual({
        websocketBaseUrl: 'ws://localhost:9000/local',
        websocketSource: 'derived-local',
      });
    });

    it('returns missing when neither explicit nor GraphQL configuration is usable', () => {
      expect(resolveWebappWebsocketBaseUrl('', '')).toEqual({
        websocketBaseUrl: null,
        websocketSource: 'missing',
      });
    });
  });
});
