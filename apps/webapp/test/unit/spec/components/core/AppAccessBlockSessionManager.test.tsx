import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { useApolloClient } from '@apollo/client';
import { useSession } from 'next-auth/react';
import AppAccessBlockSessionManager from '@/components/core/AppAccessBlockSessionManager';
import { useLogout } from '@/hooks/useLogout';
import { ROUTES } from '@/lib/constants';
import { notifyAppAccessBlocked } from '@/lib/utils/app-access-block';

jest.mock('@apollo/client', () => ({
  useApolloClient: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/hooks/useLogout', () => ({
  useLogout: jest.fn(),
}));

jest.mock('@/data/graphql/query/User/query', () => ({
  GetUserByIdDocument: {},
}));

jest.mock('@/lib/utils', () => ({
  getAuthHeader: jest.fn((token?: string | null) => (token ? { Authorization: `Bearer ${token}` } : {})),
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AppAccessBlockSessionManager', () => {
  const useApolloClientMock = useApolloClient as jest.Mock;
  const useSessionMock = useSession as jest.Mock;
  const useLogoutMock = useLogout as jest.Mock;
  const logoutMock = jest.fn();
  const queryMock = jest.fn();
  const originalLocation = window.location;
  const replaceMock = jest.fn();
  let sessionState: { data: { user: { token: string; userId: string } } | null; status: string };

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    logoutMock.mockResolvedValue(undefined);
    queryMock.mockResolvedValue({ data: {} });
    useApolloClientMock.mockReturnValue({ query: queryMock });
    useLogoutMock.mockReturnValue({ logout: logoutMock });
    sessionState = {
      data: {
        user: {
          token: 'token-a',
          userId: 'user-a',
        },
      },
      status: 'authenticated',
    };
    useSessionMock.mockImplementation(() => sessionState);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
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

  it('resets the handled blocked-session guard after sign-out so later sessions can be blocked too', async () => {
    const { rerender, unmount } = render(<AppAccessBlockSessionManager />);

    await waitFor(() => {
      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      notifyAppAccessBlocked('Blocked once');
    });

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
    });
    expect(replaceMock).toHaveBeenCalledWith(ROUTES.ACCOUNT_BLOCKED);

    sessionState = { data: null, status: 'unauthenticated' };
    rerender(<AppAccessBlockSessionManager />);

    sessionState = {
      data: {
        user: {
          token: 'token-b',
          userId: 'user-b',
        },
      },
      status: 'authenticated',
    };
    rerender(<AppAccessBlockSessionManager />);

    await waitFor(() => {
      expect(queryMock).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      notifyAppAccessBlocked('Blocked twice');
    });

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(2);
    });
    expect(replaceMock).toHaveBeenCalledTimes(2);

    unmount();
  });
});
