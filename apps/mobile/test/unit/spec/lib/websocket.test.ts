import {
  buildWebSocketAuthProtocols,
  normalizeWebSocketBaseUrl,
  resolveMobileWebsocketBaseUrl,
} from '@/lib/realtime/websocket';

describe('mobile realtime websocket utils', () => {
  describe('normalizeWebSocketBaseUrl', () => {
    it('converts https to wss', () => {
      expect(normalizeWebSocketBaseUrl('https://example.com/beta')).toBe('wss://example.com/beta');
    });

    it('converts http to ws', () => {
      expect(normalizeWebSocketBaseUrl('http://localhost:9000/local')).toBe('ws://localhost:9000/local');
    });
  });

  describe('resolveMobileWebsocketBaseUrl', () => {
    it('preserves explicit websocket overrides', () => {
      expect(
        resolveMobileWebsocketBaseUrl(
          'ws://ws.beta.af-south-1.gatherle.com',
          'https://api.beta.af-south-1.gatherle.com/graphql',
        ),
      ).toEqual({
        websocketBaseUrl: 'ws://ws.beta.af-south-1.gatherle.com',
        websocketSource: 'explicit',
      });
    });

    it('derives the remote websocket URL from the GraphQL URL when explicit config is missing', () => {
      expect(resolveMobileWebsocketBaseUrl('', 'https://api.beta.af-south-1.gatherle.com/graphql')).toEqual({
        websocketBaseUrl: 'wss://ws.beta.af-south-1.gatherle.com',
        websocketSource: 'derived-remote',
      });
    });

    it('returns missing for unsupported remote GraphQL hosts when explicit config is absent', () => {
      expect(
        resolveMobileWebsocketBaseUrl('', 'https://abc123456.execute-api.af-south-1.amazonaws.com/beta/graphql'),
      ).toEqual({
        websocketBaseUrl: null,
        websocketSource: 'missing',
      });
    });

    it('derives the local websocket URL from the GraphQL URL when explicit config is missing', () => {
      expect(resolveMobileWebsocketBaseUrl('', 'http://localhost:9000/v1/graphql')).toEqual({
        websocketBaseUrl: 'ws://localhost:9000/local',
        websocketSource: 'derived-local',
      });
    });
  });

  describe('buildWebSocketAuthProtocols', () => {
    it('includes the auth protocol and device installation protocol for approved mobile installs', () => {
      expect(buildWebSocketAuthProtocols('abc.def.ghi', 'device-installation-id')).toEqual([
        'gatherle.jwt.abc.def.ghi',
        'gatherle.installation.device-installation-id',
      ]);
    });

    it('falls back to auth-only when no installation id is available', () => {
      expect(buildWebSocketAuthProtocols('abc.def.ghi')).toEqual(['gatherle.jwt.abc.def.ghi']);
    });
  });
});
