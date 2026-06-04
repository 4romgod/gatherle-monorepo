import { STORAGE_NAMESPACES } from '@/hooks/usePersistentState/constants';
import { APP_NAMESPACE } from '@/lib/constants/app';
import { clearLogoutBrowserState } from '@/lib/utils/logout';
import { logger } from '@/lib/utils/logger';

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

const loggerMock = logger as jest.Mocked<typeof logger>;

function createStorageMock(keys: Array<string | null>, options?: { throwOnKey?: boolean }) {
  const store = new Map(
    keys.filter((key): key is string => typeof key === 'string').map((key) => [key, JSON.stringify({ value: key })]),
  );

  return {
    get length() {
      return keys.length;
    },
    key: jest.fn((index: number) => {
      if (options?.throwOnKey) {
        throw new Error('storage unavailable');
      }

      return keys[index] ?? null;
    }),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
    }),
  } as unknown as Storage;
}

describe('clearLogoutBrowserState', () => {
  const originalWindow = window;
  const originalLocalStorage = window.localStorage;
  const originalSessionStorage = window.sessionStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: originalSessionStorage,
    });
  });

  it('removes only Gatherle logout-scoped keys from local and session storage', () => {
    window.localStorage.setItem(`${APP_NAMESPACE}:sessionstate:user-1`, '{"value":1}');
    window.localStorage.setItem(`${STORAGE_NAMESPACES.FILTERS}:user-1:events`, '{"value":1}');
    window.localStorage.setItem('preferences:theme-mode', '"dark"');
    window.sessionStorage.setItem(`${STORAGE_NAMESPACES.EVENT_MUTATION}:draft`, '{"value":1}');
    window.sessionStorage.setItem('unrelated-key', '"keep"');

    clearLogoutBrowserState();

    expect(window.localStorage.getItem(`${APP_NAMESPACE}:sessionstate:user-1`)).toBeNull();
    expect(window.localStorage.getItem(`${STORAGE_NAMESPACES.FILTERS}:user-1:events`)).toBeNull();
    expect(window.sessionStorage.getItem(`${STORAGE_NAMESPACES.EVENT_MUTATION}:draft`)).toBeNull();
    expect(window.localStorage.getItem('preferences:theme-mode')).toBe('"dark"');
    expect(window.sessionStorage.getItem('unrelated-key')).toBe('"keep"');
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('returns early when window is unavailable', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    });

    expect(() => clearLogoutBrowserState()).not.toThrow();

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  });

  it('skips missing storage objects and ignores null keys', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: null,
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: createStorageMock([null, `${APP_NAMESPACE}:chat:recent`]),
    });

    expect(() => clearLogoutBrowserState()).not.toThrow();
    expect(loggerMock.warn).not.toHaveBeenCalled();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: originalSessionStorage,
    });
  });

  it('logs a warning when a storage implementation throws during clearing', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock([`${APP_NAMESPACE}:sessionstate:user-1`], { throwOnKey: true }),
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: createStorageMock([`${STORAGE_NAMESPACES.VENUE_MUTATION}:draft`], { throwOnKey: true }),
    });

    clearLogoutBrowserState();

    expect(loggerMock.warn).toHaveBeenCalledWith('Failed to clear localStorage during logout', expect.any(Error));
    expect(loggerMock.warn).toHaveBeenCalledWith('Failed to clear sessionStorage during logout', expect.any(Error));

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: originalSessionStorage,
    });
  });
});
