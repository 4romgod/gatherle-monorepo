import { getBaseUrl, getFullUrl } from '@/lib/utils/url';
import { headers } from 'next/headers';

// Mock next/headers
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

const mockHeaders = headers as jest.MockedFunction<typeof headers>;

describe('URL Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBaseUrl', () => {
    it('should return https URL with host from headers', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('example.com'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getBaseUrl();
      expect(result).toBe('https://example.com');
    });

    it('should default to localhost:3000 when host header is missing', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue(null),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getBaseUrl();
      expect(result).toBe('https://localhost:3000');
    });

    it('should handle host with port', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('localhost:3001'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getBaseUrl();
      expect(result).toBe('https://localhost:3001');
    });

    it('should handle production domain', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('gatherle.com'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getBaseUrl();
      expect(result).toBe('https://gatherle.com');
    });

    it('should handle subdomain', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('api.gatherle.com'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getBaseUrl();
      expect(result).toBe('https://api.gatherle.com');
    });
  });

  describe('getFullUrl', () => {
    it('should construct full URL with path', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('example.com'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getFullUrl('/events/my-event');
      expect(result).toBe('https://example.com/events/my-event');
    });

    it('should handle root path', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('example.com'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getFullUrl('/');
      expect(result).toBe('https://example.com/');
    });

    it('should handle complex paths', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('gatherle.com'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getFullUrl('/organizations/123/events');
      expect(result).toBe('https://gatherle.com/organizations/123/events');
    });

    it('should handle paths with query parameters', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('example.com'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getFullUrl('/events?category=music&date=today');
      expect(result).toBe('https://example.com/events?category=music&date=today');
    });

    it('should handle paths with hash fragments', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('example.com'),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getFullUrl('/events#featured');
      expect(result).toBe('https://example.com/events#featured');
    });

    it('should use default host when headers are empty', async () => {
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue(null),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const result = await getFullUrl('/test');
      expect(result).toBe('https://localhost:3000/test');
    });
  });
});
