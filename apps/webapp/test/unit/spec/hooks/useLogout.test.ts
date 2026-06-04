import { act, renderHook } from '@testing-library/react';
import { useApolloClient } from '@apollo/client';
import { signOut } from 'next-auth/react';
import { logoutUserAction } from '@/data/actions/server/auth/logout';
import { useLogout } from '@/hooks/useLogout';
import { ROUTES } from '@/lib/constants';
import { logger } from '@/lib/utils';

jest.mock('@apollo/client', () => ({
  useApolloClient: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

jest.mock('@/data/actions/server/auth/logout', () => ({
  logoutUserAction: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const signOutMock = signOut as jest.Mock;
const useApolloClientMock = useApolloClient as jest.Mock;
const logoutUserActionMock = logoutUserAction as jest.Mock;
const loggerMock = logger as jest.Mocked<typeof logger>;

describe('useLogout', () => {
  const clearStore = jest.fn();
  const originalLocation = window.location;
  const replaceMock = jest.fn();
  const assignMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearStore.mockResolvedValue(undefined);
    signOutMock.mockResolvedValue(undefined);
    logoutUserActionMock.mockResolvedValue(undefined);
    useApolloClientMock.mockReturnValue({ clearStore });
    window.localStorage.clear();
    window.sessionStorage.clear();

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        assign: assignMock,
        replace: replaceMock,
      },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('clears Gatherle browser state, clears Apollo cache, and redirects after server logout', async () => {
    window.localStorage.setItem('gatherle:sessionstate:user-1:events-filter-state', JSON.stringify({ value: [] }));
    window.localStorage.setItem('filters:user-1:events-filter-state', JSON.stringify({ value: [] }));
    window.localStorage.setItem('preferences:theme-mode', JSON.stringify({ value: 'dark' }));
    window.localStorage.setItem('unrelated-key', 'keep');
    window.sessionStorage.setItem('venue-mutation:new', JSON.stringify({ value: { name: 'Draft venue' } }));

    const { result } = renderHook(() => useLogout());

    expect(result.current.isLoggingOut).toBe(false);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isLoggingOut).toBe(false);
    expect(clearStore).toHaveBeenCalledTimes(1);
    expect(logoutUserActionMock).toHaveBeenCalledWith(ROUTES.ROOT);
    expect(signOutMock).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith(ROUTES.ROOT);
    expect(window.localStorage.getItem('gatherle:sessionstate:user-1:events-filter-state')).toBeNull();
    expect(window.localStorage.getItem('filters:user-1:events-filter-state')).toBeNull();
    expect(window.sessionStorage.getItem('venue-mutation:new')).toBeNull();
    expect(window.localStorage.getItem('preferences:theme-mode')).toBe(JSON.stringify({ value: 'dark' }));
    expect(window.localStorage.getItem('unrelated-key')).toBe('keep');
    expect(loggerMock.warn).not.toHaveBeenCalled();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('still redirects when Apollo cache clearing fails', async () => {
    const cacheError = new Error('cache failed');
    clearStore.mockRejectedValue(cacheError);

    const { result } = renderHook(() => useLogout('/auth/login'));

    await act(async () => {
      await result.current.logout();
    });

    expect(loggerMock.warn).toHaveBeenCalledWith('Failed to clear Apollo cache during logout', cacheError);
    expect(logoutUserActionMock).toHaveBeenCalledWith('/auth/login');
    expect(replaceMock).toHaveBeenCalledWith('/auth/login');
  });

  it('falls back to client signOut when the server logout action fails', async () => {
    const logoutError = new Error('server logout failed');
    logoutUserActionMock.mockRejectedValue(logoutError);

    const { result } = renderHook(() => useLogout('/auth/login'));

    await act(async () => {
      await result.current.logout();
    });

    expect(loggerMock.error).toHaveBeenCalledWith('Failed to clear server auth session during logout', logoutError);
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    expect(replaceMock).toHaveBeenCalledWith('/auth/login');
  });

  it('supports signing out without a redirect', async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.logout({ redirect: false });
    });

    expect(clearStore).toHaveBeenCalledTimes(1);
    expect(logoutUserActionMock).toHaveBeenCalledWith(ROUTES.ROOT);
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    expect(replaceMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    expect(loggerMock.warn).not.toHaveBeenCalled();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });
});
