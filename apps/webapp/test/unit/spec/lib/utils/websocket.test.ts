import { buildWebSocketAuthProtocols, normalizeWebSocketBaseUrl } from '@/lib/utils/websocket';

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
});
