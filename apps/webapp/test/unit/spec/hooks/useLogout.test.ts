import { act, renderHook } from '@testing-library/react';
import { signOut } from 'next-auth/react';
import { useApolloClient } from '@apollo/client';
import { useLogout } from '@/hooks/useLogout';
import { ROUTES } from '@/lib/constants';
import { logger } from '@/lib/utils';

jest.mock('@apollo/client', () => ({
  useApolloClient: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const signOutMock = signOut as jest.Mock;
const useApolloClientMock = useApolloClient as jest.Mock;
const loggerMock = logger as jest.Mocked<typeof logger>;

describe('useLogout', () => {
  const clearStore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearStore.mockResolvedValue(undefined);
    signOutMock.mockResolvedValue(undefined);
    useApolloClientMock.mockReturnValue({ clearStore });
  });

  it('clears Apollo cache and signs out to the root route by default', async () => {
    const { result } = renderHook(() => useLogout());

    expect(result.current.isLoggingOut).toBe(false);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isLoggingOut).toBe(false);
    expect(clearStore).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ redirect: true, redirectTo: ROUTES.ROOT });
    expect(loggerMock.warn).not.toHaveBeenCalled();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('still signs out when Apollo cache clearing fails', async () => {
    const cacheError = new Error('cache failed');
    clearStore.mockRejectedValue(cacheError);

    const { result } = renderHook(() => useLogout('/auth/login'));

    await act(async () => {
      await result.current.logout();
    });

    expect(loggerMock.warn).toHaveBeenCalledWith('Failed to clear Apollo cache during logout', cacheError);
    expect(signOutMock).toHaveBeenCalledWith({ redirect: true, redirectTo: '/auth/login' });
  });
});
