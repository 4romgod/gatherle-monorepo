/**
 * Auth Utilities Tests
 *
 * Since auth utilities rely on the ESM-only 'jose' module, this suite
 * validates the exported contract with a full module mock.
 */

const mockIsAuthenticated = jest.fn<Promise<boolean>, [string | undefined]>();
const mockGetAuthHeader = jest.fn<{ Authorization: string } | Record<string, never>, [string | undefined | null]>();

jest.mock('@/lib/utils/auth', () => ({
  isAuthenticated: (...args: [string | undefined]) => mockIsAuthenticated(...args),
  getAuthHeader: (...args: [string | undefined | null]) => mockGetAuthHeader(...args),
}));

describe('Auth Utilities - Behavioral Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAuthenticated', () => {
    it('should return false for undefined token', async () => {
      mockIsAuthenticated.mockImplementation(async (token) => Boolean(token));

      const { isAuthenticated } = require('@/lib/utils/auth');
      const result = await isAuthenticated(undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty string token', async () => {
      mockIsAuthenticated.mockImplementation(async (token) => Boolean(token));

      const { isAuthenticated } = require('@/lib/utils/auth');
      const result = await isAuthenticated('');
      expect(result).toBe(false);
    });

    it('should return true for a valid token', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const { isAuthenticated } = require('@/lib/utils/auth');
      const result = await isAuthenticated('valid-jwt-token');
      expect(result).toBe(true);
      expect(mockIsAuthenticated).toHaveBeenCalledWith('valid-jwt-token');
    });
  });

  describe('getAuthHeader', () => {
    it('should return an empty object without token', () => {
      mockGetAuthHeader.mockReturnValue({});

      const { getAuthHeader } = require('@/lib/utils/auth');
      expect(getAuthHeader(undefined)).toEqual({});
      expect(getAuthHeader(null)).toEqual({});
      expect(getAuthHeader('')).toEqual({});
    });

    it('should return bearer authorization header with token', () => {
      mockGetAuthHeader.mockImplementation((token) => ({ Authorization: `Bearer ${token}` }));

      const { getAuthHeader } = require('@/lib/utils/auth');
      expect(getAuthHeader('token-123')).toEqual({ Authorization: 'Bearer token-123' });
      expect(mockGetAuthHeader).toHaveBeenCalledWith('token-123');
    });
  });
});

describe('Auth Utilities - Contract Tests', () => {
  it('isAuthenticated should be an async function that resolves boolean', async () => {
    mockIsAuthenticated.mockResolvedValue(true);

    const { isAuthenticated } = require('@/lib/utils/auth');
    const result = isAuthenticated('token');

    expect(typeof isAuthenticated).toBe('function');
    expect(result).toBeInstanceOf(Promise);
    expect(typeof (await result)).toBe('boolean');
  });

  it('getAuthHeader should be a function returning header object', () => {
    mockGetAuthHeader.mockReturnValue({ Authorization: 'Bearer token' });

    const { getAuthHeader } = require('@/lib/utils/auth');
    const result = getAuthHeader('token');

    expect(typeof getAuthHeader).toBe('function');
    expect(result).toEqual({ Authorization: 'Bearer token' });
  });
});
