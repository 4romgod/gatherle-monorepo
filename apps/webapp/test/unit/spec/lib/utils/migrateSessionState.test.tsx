import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useMigrateSessionState } from '@/lib/utils/migrateSessionState';
import { SaveSessionStateDocument } from '@/data/graphql/mutation/SessionState/mutation';
import { getAuthHeader } from '@/lib/utils/auth';

// Mock getAuthHeader
jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn((token) => ({ Authorization: `Bearer ${token}` })),
}));

describe('useMigrateSessionState', () => {
  const mockToken = 'test-token';
  const mockUserId = 'user-123';
  const namespace = 'ntlango:sessionstate';

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Key matching and filtering', () => {
    it('should migrate only keys matching the namespace pattern', async () => {
      const matchingKey = `${namespace}:${mockUserId}:event-filter`;
      const nonMatchingKey = `other:${mockUserId}:filter`;
      const wrongUserKey = `${namespace}:other-user:filter`;

      localStorage.setItem(matchingKey, JSON.stringify({ value: { categories: [] } }));
      localStorage.setItem(nonMatchingKey, JSON.stringify({ value: { data: 'test' } }));
      localStorage.setItem(wrongUserKey, JSON.stringify({ value: { data: 'test' } }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: {
                key: 'event-filter',
                value: { categories: [] },
                version: 1,
              },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'event-filter',
                value: { categories: [] },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.migratedKeys).toEqual(['event-filter']);
        expect(migrationResult.migratedKeys).toHaveLength(1);
        expect(migrationResult.success).toBe(true);
      });
    });

    it('should skip entries with expired TTL', async () => {
      const expiredKey = `${namespace}:${mockUserId}:expired-filter`;
      const validKey = `${namespace}:${mockUserId}:valid-filter`;

      const pastTimestamp = Date.now() - 1000; // 1 second ago
      const futureTimestamp = Date.now() + 10000; // 10 seconds in future

      localStorage.setItem(expiredKey, JSON.stringify({ value: { data: 'old' }, expiresAt: pastTimestamp }));
      localStorage.setItem(validKey, JSON.stringify({ value: { data: 'new' }, expiresAt: futureTimestamp }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: {
                key: 'valid-filter',
                value: { data: 'new' },
                version: 1,
              },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'valid-filter',
                value: { data: 'new' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.migratedKeys).toEqual(['valid-filter']);
        expect(migrationResult.migratedKeys).not.toContain('expired-filter');
        expect(migrationResult.success).toBe(true);
      });
    });

    it('should handle entries without expiresAt field', async () => {
      const keyWithoutExpiry = `${namespace}:${mockUserId}:permanent-filter`;

      localStorage.setItem(keyWithoutExpiry, JSON.stringify({ value: { data: 'permanent' } }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: {
                key: 'permanent-filter',
                value: { data: 'permanent' },
                version: 1,
              },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'permanent-filter',
                value: { data: 'permanent' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.migratedKeys).toContain('permanent-filter');
        expect(migrationResult.success).toBe(true);
      });
    });
  });

  describe('Parse failure handling', () => {
    it('should skip entries with invalid JSON and continue migration', async () => {
      const invalidJsonKey = `${namespace}:${mockUserId}:invalid-json`;
      const validKey = `${namespace}:${mockUserId}:valid-key`;

      localStorage.setItem(invalidJsonKey, 'not-valid-json{');
      localStorage.setItem(validKey, JSON.stringify({ value: { data: 'valid' } }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: {
                key: 'valid-key',
                value: { data: 'valid' },
                version: 1,
              },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'valid-key',
                value: { data: 'valid' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.migratedKeys).toEqual(['valid-key']);
        expect(migrationResult.migratedKeys).not.toContain('invalid-json');
        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(migrationResult.success).toBe(true);
      });

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Successful mutations', () => {
    it('should successfully migrate multiple keys', async () => {
      const key1 = `${namespace}:${mockUserId}:filter-1`;
      const key2 = `${namespace}:${mockUserId}:filter-2`;
      const key3 = `${namespace}:${mockUserId}:filter-3`;

      localStorage.setItem(key1, JSON.stringify({ value: { data: 'value1' } }));
      localStorage.setItem(key2, JSON.stringify({ value: { data: 'value2' } }));
      localStorage.setItem(key3, JSON.stringify({ value: { data: 'value3' } }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-1', value: { data: 'value1' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter-1',
                value: { data: 'value1' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-2', value: { data: 'value2' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter-2',
                value: { data: 'value2' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-3', value: { data: 'value3' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter-3',
                value: { data: 'value3' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.migratedKeys).toEqual(['filter-1', 'filter-2', 'filter-3']);
        expect(migrationResult.errors).toEqual([]);
        expect(migrationResult.success).toBe(true);
      });
    });

    it('should call onProgress callback during migration', async () => {
      const key1 = `${namespace}:${mockUserId}:filter-1`;
      const key2 = `${namespace}:${mockUserId}:filter-2`;

      localStorage.setItem(key1, JSON.stringify({ value: { data: 'value1' } }));
      localStorage.setItem(key2, JSON.stringify({ value: { data: 'value2' } }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-1', value: { data: 'value1' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter-1',
                value: { data: 'value1' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-2', value: { data: 'value2' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter-2',
                value: { data: 'value2' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const onProgress = jest.fn();
      await result.current.migrate(mockToken, mockUserId, namespace, onProgress);

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledTimes(2);
        expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2, 'filter-1');
        expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2, 'filter-2');
      });
    });
  });

  describe('Error collection and handling', () => {
    it('should collect errors when mutations fail', async () => {
      const key1 = `${namespace}:${mockUserId}:filter-1`;
      const key2 = `${namespace}:${mockUserId}:filter-2`;

      localStorage.setItem(key1, JSON.stringify({ value: { data: 'value1' } }));
      localStorage.setItem(key2, JSON.stringify({ value: { data: 'value2' } }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-1', value: { data: 'value1' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          error: new Error('Network error'),
        },
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-2', value: { data: 'value2' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter-2',
                value: { data: 'value2' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.success).toBe(false);
        expect(migrationResult.migratedKeys).toEqual(['filter-2']);
        expect(migrationResult.errors).toEqual([{ key: 'filter-1', error: 'Network error' }]);
      });
    });

    it('should continue migration after individual failures', async () => {
      const key1 = `${namespace}:${mockUserId}:filter-1`;
      const key2 = `${namespace}:${mockUserId}:filter-2`;
      const key3 = `${namespace}:${mockUserId}:filter-3`;

      localStorage.setItem(key1, JSON.stringify({ value: { data: 'value1' } }));
      localStorage.setItem(key2, JSON.stringify({ value: { data: 'value2' } }));
      localStorage.setItem(key3, JSON.stringify({ value: { data: 'value3' } }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-1', value: { data: 'value1' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter-1',
                value: { data: 'value1' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-2', value: { data: 'value2' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          error: new Error('Authorization failed'),
        },
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter-3', value: { data: 'value3' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter-3',
                value: { data: 'value3' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.success).toBe(false);
        expect(migrationResult.migratedKeys).toEqual(['filter-1', 'filter-3']);
        expect(migrationResult.errors).toHaveLength(1);
        expect(migrationResult.errors[0]).toEqual({ key: 'filter-2', error: 'Authorization failed' });
      });
    });
  });

  describe('Edge cases', () => {
    it('should return empty result when no keys match', async () => {
      localStorage.setItem('unrelated-key', JSON.stringify({ value: 'data' }));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={[]} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.migratedKeys).toEqual([]);
        expect(migrationResult.errors).toEqual([]);
        expect(migrationResult.success).toBe(true);
      });
    });

    it('should handle empty localStorage', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={[]} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      const migrationResult = await result.current.migrate(mockToken, mockUserId, namespace);

      await waitFor(() => {
        expect(migrationResult.migratedKeys).toEqual([]);
        expect(migrationResult.errors).toEqual([]);
        expect(migrationResult.success).toBe(true);
      });
    });

    it('should use default namespace when not provided', async () => {
      const defaultNamespace = 'ntlango:sessionstate';
      const key = `${defaultNamespace}:${mockUserId}:filter`;

      localStorage.setItem(key, JSON.stringify({ value: { data: 'test' } }));

      const mocks = [
        {
          request: {
            query: SaveSessionStateDocument,
            variables: {
              input: { key: 'filter', value: { data: 'test' }, version: 1 },
            },
            context: { headers: getAuthHeader(mockToken) },
          },
          result: {
            data: {
              saveSessionState: {
                key: 'filter',
                value: { data: 'test' },
                version: 1,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useMigrateSessionState(), { wrapper });

      // Call without namespace parameter
      const migrationResult = await result.current.migrate(mockToken, mockUserId);

      await waitFor(() => {
        expect(migrationResult.migratedKeys).toEqual(['filter']);
        expect(migrationResult.success).toBe(true);
      });
    });
  });
});
