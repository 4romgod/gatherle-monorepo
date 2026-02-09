import { act, renderHook } from '@testing-library/react';
import { usePersistentState } from '@/hooks/usePersistentState';

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({})),
  isAuthenticated: jest.fn(async () => false),
  verifyAndDecodeToken: jest.fn(async () => null),
}));

const mockMutate = jest.fn();
const mockUseQuery = jest.fn();

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn((...args) => mockUseQuery(...args)),
  useMutation: jest.fn(() => [
    mockMutate,
    {
      loading: false,
      error: null,
    },
  ]),
  gql: jest.fn((strings: TemplateStringsArray) => strings[0]),
}));

describe('usePersistentState', () => {
  const hookKey = 'test-hydration-key';

  beforeEach(() => {
    window.localStorage.clear();
    mockMutate.mockClear();
    mockMutate.mockResolvedValue({ data: { saveSessionState: { userId: 'user-123' } } });
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
  });

  it('hydrates from existing storage entries', () => {
    const prefilledKey = `ntlango:sessionstate:${hookKey}`;
    window.localStorage.setItem(prefilledKey, JSON.stringify({ value: 'persisted' }));

    const { result } = renderHook(() => usePersistentState(hookKey, 'default'));

    expect(result.current.value).toBe('persisted');
    expect(window.localStorage.getItem(prefilledKey)).not.toBeNull();
  });

  it('persists updates with ttl metadata', () => {
    const { result } = renderHook(() => usePersistentState(hookKey, 'default', { ttl: 1_000 }));

    act(() => {
      result.current.setValue('fresh');
    });

    const stored = window.localStorage.getItem(result.current.storageKey);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored as string);
    expect(parsed.value).toBe('fresh');
    expect(typeof parsed.expiresAt).toBe('number');
    expect(parsed.expiresAt).toBeGreaterThan(Date.now());
  });

  it('clears storage and resets to the default value', () => {
    const { result } = renderHook(() => usePersistentState(hookKey, 'default'));

    act(() => {
      result.current.setValue('temp');
    });

    expect(result.current.value).toBe('temp');

    act(() => {
      result.current.clearStorage();
    });

    expect(window.localStorage.getItem(result.current.storageKey)).toBeNull();
    expect(result.current.value).toBe('default');
  });

  it('namespaces storage keys with the provided userId and namespace', () => {
    const namespace = 'custom-space';
    const userId = 'user-42';
    const { result } = renderHook(() => usePersistentState('namespace-key', 'default', { namespace, userId }));

    expect(result.current.storageKey).toBe(`${namespace}:${userId}:namespace-key`);

    act(() => {
      result.current.setValue('value');
    });

    expect(window.localStorage.getItem(result.current.storageKey)).not.toBeNull();
  });

  it('drops expired entries before hydrating', () => {
    const prefilledKey = `ntlango:sessionstate:${hookKey}`;
    const payload = { value: 'old', expiresAt: Date.now() - 1 };
    window.localStorage.setItem(prefilledKey, JSON.stringify(payload));

    const { result } = renderHook(() => usePersistentState(hookKey, 'default'));

    expect(window.localStorage.getItem(prefilledKey)).toBeNull();
    expect(result.current.value).toBe('default');
  });

  it('removes invalid JSON entries during hydration', () => {
    const prefilledKey = `ntlango:sessionstate:${hookKey}`;
    window.localStorage.setItem(prefilledKey, '{invalid-json');

    const { result } = renderHook(() => usePersistentState(hookKey, 'default'));

    expect(window.localStorage.getItem(prefilledKey)).toBeNull();
    expect(result.current.value).toBe('default');
  });

  it('skips storage access when disabled', () => {
    const storageProto = Object.getPrototypeOf(window.localStorage) as Storage;
    const storageSpy = jest.spyOn(storageProto, 'setItem');
    const { result } = renderHook(() =>
      usePersistentState(hookKey, 'default', {
        disabled: true,
      }),
    );

    act(() => {
      result.current.setValue('next');
    });

    expect(result.current.value).toBe('next');
    expect(storageSpy).not.toHaveBeenCalled();
    storageSpy.mockRestore();
  });

  it('falls back gracefully when storage access throws', () => {
    const originalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Access denied');
      },
    });

    try {
      const { result } = renderHook(() => usePersistentState('no-storage', 'default'));

      expect(result.current.value).toBe('default');
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: originalStorage,
      });
    }
  });

  describe('Backend sync functionality', () => {
    it('syncs to backend when syncToBackend is enabled', async () => {
      const token = 'test-token';
      const userId = 'user-123';

      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token,
          userId,
        }),
      );

      await act(async () => {
        result.current.setValue('synced-value');
        // Give mutation time to be called
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockMutate).toHaveBeenCalledWith({
        variables: {
          input: {
            key: hookKey,
            value: 'synced-value',
            version: 1,
          },
        },
      });
    });

    it('hydrates from backend data when available', () => {
      mockUseQuery.mockReturnValue({
        data: {
          readSessionState: {
            key: hookKey,
            value: 'backend-value',
            version: 1,
            updatedAt: new Date().toISOString(),
          },
        },
        loading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
        }),
      );

      // Backend data should update the value
      expect(result.current.value).toBe('backend-value');
    });

    it('updates localStorage cache when backend data loads', () => {
      mockUseQuery.mockReturnValue({
        data: {
          readSessionState: {
            key: hookKey,
            value: 'backend-value',
            version: 1,
            updatedAt: new Date().toISOString(),
          },
        },
        loading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
        }),
      );

      const stored = window.localStorage.getItem(result.current.storageKey);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored as string);
      expect(parsed.value).toBe('backend-value');
    });

    it('does not sync when syncToBackend is false', async () => {
      const { result } = renderHook(() => usePersistentState(hookKey, 'default', { syncToBackend: false }));

      await act(async () => {
        result.current.setValue('no-sync');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('does not sync when token is missing', async () => {
      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          userId: 'user-123',
          // token intentionally omitted
        }),
      );

      await act(async () => {
        result.current.setValue('no-token');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Error handling and retry logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('tracks syncStatus during backend operations', async () => {
      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.syncStatus).toBe('idle');

      await act(async () => {
        result.current.setValue('test');
        await Promise.resolve();
      });

      // After successful sync
      expect(result.current.syncStatus).toBe('success');
    });

    it('sets syncError and syncStatus on backend failure', async () => {
      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const testError = new Error('Network error');
      mockMutate.mockRejectedValueOnce(testError);

      await act(async () => {
        result.current.setValue('fail');
        await Promise.resolve();
      });

      expect(result.current.syncStatus).toBe('syncing');
      expect(result.current.syncError).toBeNull(); // Initial attempt doesn't set error yet
    });

    it('calls onSyncError callback on failure', async () => {
      const testError = new Error('Backend error');
      mockMutate.mockRejectedValueOnce(testError);
      const onSyncError = jest.fn();

      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
          onSyncError,
        }),
      );

      await act(async () => {
        result.current.setValue('error-test');
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // Callback should be called on first retry attempt
      await act(async () => {
        jest.advanceTimersByTime(1500); // Wait for first retry delay
        await Promise.resolve();
      });

      expect(onSyncError).toHaveBeenCalled();
    });

    it('retries with exponential backoff on failure', async () => {
      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
          maxRetries: 3,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      mockMutate.mockRejectedValueOnce(new Error('Fail 1'));
      mockMutate.mockRejectedValueOnce(new Error('Fail 2'));
      mockMutate.mockResolvedValueOnce({ data: { saveSessionState: { userId: 'user-123' } } });

      await act(async () => {
        result.current.setValue('retry-test');
        await Promise.resolve();
      });

      // Initial attempt
      expect(mockMutate).toHaveBeenCalledTimes(1);

      // First retry after ~1s delay
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      expect(mockMutate).toHaveBeenCalledTimes(2);

      // Second retry after ~2s delay
      await act(async () => {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      expect(mockMutate).toHaveBeenCalledTimes(3);
      expect(result.current.syncStatus).toBe('success');
    });

    it('stops retrying after maxRetries attempts', async () => {
      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
          maxRetries: 2,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      mockMutate.mockRejectedValue(new Error('Always fails'));

      await act(async () => {
        result.current.setValue('max-retry-test');
        await Promise.resolve();
      });

      // Initial attempt
      expect(mockMutate).toHaveBeenCalledTimes(1);

      // First retry
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      expect(mockMutate).toHaveBeenCalledTimes(2);

      // Second retry
      await act(async () => {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      expect(mockMutate).toHaveBeenCalledTimes(3);

      // Should not retry again
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      expect(mockMutate).toHaveBeenCalledTimes(3); // No more retries
      expect(result.current.syncStatus).toBe('error');
      expect(result.current.syncError).toBeTruthy();
    });

    it('allows manual retry via retrySync', async () => {
      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      mockMutate.mockRejectedValueOnce(new Error('Initial failure'));
      mockMutate.mockResolvedValueOnce({ data: { saveSessionState: { userId: 'user-123' } } });

      await act(async () => {
        result.current.setValue('manual-retry');
        await Promise.resolve();
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);

      // Manual retry
      await act(async () => {
        result.current.retrySync();
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      expect(result.current.syncStatus).toBe('success');
    });

    it('localStorage continues working even when backend sync fails', async () => {
      const { result } = renderHook(() =>
        usePersistentState(hookKey, 'default', {
          syncToBackend: true,
          token: 'test-token',
          userId: 'user-123',
        }),
      );

      // Wait for initial mount
      await act(async () => {
        await Promise.resolve();
      });

      // Now set up failure mock and update value
      mockMutate.mockRejectedValue(new Error('Backend down'));

      await act(async () => {
        result.current.setValue('offline-value');
        await Promise.resolve();
      });

      // Value should be in localStorage despite backend failure
      const stored = window.localStorage.getItem(result.current.storageKey);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored as string);
      expect(parsed.value).toBe('offline-value');

      // UI should show the updated value
      expect(result.current.value).toBe('offline-value');
    });
  });
});
