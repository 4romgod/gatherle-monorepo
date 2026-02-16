import { act, renderHook } from '@testing-library/react';
import { useNotifications, useNotificationActions, useUnreadNotificationCount } from '@/hooks/useNotifications';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  __esModule: true,
  getAuthHeader: jest.fn(() => ({})),
}));

const { useMutation: useMutationMock, useQuery: useQueryMock } = require('@apollo/client');

describe('useNotifications', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useQueryMock.mockReset();
  });

  it('returns notifications and calls fetchMore when more pages exist', async () => {
    const fetchMore = jest.fn().mockResolvedValue({});
    useQueryMock.mockReturnValue({
      data: {
        notifications: {
          notifications: [{ notificationId: 'note-1' }],
          hasMore: true,
          nextCursor: 'cursor-1',
        },
        unreadCount: 3,
      },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
      fetchMore,
    });

    const { result } = renderHook(() => useNotifications({ limit: 5, unreadOnly: true }));

    expect(result.current.notifications).toEqual([{ notificationId: 'note-1' }]);
    expect(result.current.hasMore).toBe(true);
    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchMore).toHaveBeenCalledWith({
      variables: { cursor: 'cursor-1', limit: 5, unreadOnly: true },
      updateQuery: expect.any(Function),
    });
  });

  it('does not call fetchMore if there is no next cursor', async () => {
    const fetchMore = jest.fn().mockResolvedValue({});
    useQueryMock.mockReturnValue({
      data: {
        notifications: {
          notifications: [],
          hasMore: false,
          nextCursor: null,
        },
        unreadCount: 0,
      },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
      fetchMore,
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchMore).not.toHaveBeenCalled();
  });
});

describe('useUnreadNotificationCount', () => {
  it('returns unread count from query without polling', () => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useQueryMock.mockReturnValue({
      data: { unreadNotificationCount: 5 },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUnreadNotificationCount());
    expect(result.current.unreadCount).toBe(5);
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: false,
      }),
    );
    const queryOptions = useQueryMock.mock.calls[0][1];
    expect(queryOptions).not.toHaveProperty('pollInterval');
  });

  it('skips unread count query when token is missing', () => {
    mockUseSession.mockReturnValue({ data: null });
    useQueryMock.mockReturnValue({
      data: { unreadNotificationCount: 0 },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    renderHook(() => useUnreadNotificationCount());

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: true,
      }),
    );
  });
});

describe('useNotificationActions', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useMutationMock.mockReset();
  });

  it('provides action helpers that call the mutations', async () => {
    const markReadMutation = jest.fn().mockResolvedValue({});
    const markAllReadMutation = jest.fn().mockResolvedValue({});
    const deleteMutation = jest.fn().mockResolvedValue({});

    useMutationMock
      .mockImplementationOnce(() => [markReadMutation, { loading: false }])
      .mockImplementationOnce(() => [markAllReadMutation, { loading: false }])
      .mockImplementationOnce(() => [deleteMutation, { loading: false }]);

    const { result } = renderHook(() => useNotificationActions());

    await act(async () => {
      await result.current.markAsRead('note-1');
    });
    await act(async () => {
      await result.current.markAllAsRead();
    });
    await act(async () => {
      await result.current.deleteNotification('note-1');
    });

    expect(markReadMutation).toHaveBeenCalledWith({ variables: { notificationId: 'note-1' } });
    expect(markAllReadMutation).toHaveBeenCalled();
    expect(deleteMutation).toHaveBeenCalledWith({ variables: { notificationId: 'note-1' } });
    expect(result.current.isLoading).toBe(false);
  });
});
