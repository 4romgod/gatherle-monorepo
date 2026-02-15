import { addTokenToWebSocketUrl, normalizeWebSocketBaseUrl } from '@/lib/utils/websocket';

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

  describe('addTokenToWebSocketUrl', () => {
    it('adds token as query parameter', () => {
      expect(addTokenToWebSocketUrl('wss://api.example.com/beta', 'abc.def.ghi')).toBe(
        'wss://api.example.com/beta?token=abc.def.ghi',
      );
    });

    it('appends token to existing query string', () => {
      expect(addTokenToWebSocketUrl('wss://api.example.com/beta?foo=bar', 'abc.def.ghi')).toBe(
        'wss://api.example.com/beta?foo=bar&token=abc.def.ghi',
      );
    });
  });
});
