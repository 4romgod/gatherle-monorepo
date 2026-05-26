import { act, renderHook, waitFor } from '@testing-library/react';
import { usePaginatedFollowers, usePaginatedUserFollowing } from '@/hooks/useProfileConnections';
import { FollowTargetType, SortOrderInput } from '@/data/graphql/types/graphql';

const useLazyQueryMock = jest.fn();
const loggerErrorMock = jest.fn();

jest.mock('@apollo/client', () => ({
  useLazyQuery: (...args: unknown[]) => useLazyQueryMock(...args),
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn((token?: string | null) => (token ? { Authorization: `Bearer ${token}` } : {})),
}));

jest.mock('@/lib/utils', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

describe('useProfileConnections', () => {
  const createFollow = (followId: string, targetId = `target-${followId}`) =>
    ({
      followId,
      targetId,
      targetType: FollowTargetType.User,
      approvalStatus: 'Accepted',
      createdAt: '2026-05-25T10:00:00.000Z',
      followerUserId: 'user-1',
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePaginatedFollowers', () => {
    it('does not request data when disabled or missing a userId', async () => {
      const loadFollowers = jest.fn();
      useLazyQueryMock.mockImplementation(() => [loadFollowers, { loading: false }]);

      const { result, rerender } = renderHook(
        ({ userId, enabled }: { userId?: string; enabled?: boolean }) =>
          usePaginatedFollowers(userId, 'token', { enabled }),
        {
          initialProps: { userId: undefined, enabled: true },
        },
      );

      await act(async () => {});
      expect(result.current.followers).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(loadFollowers).not.toHaveBeenCalled();

      rerender({ userId: 'user-1', enabled: false });
      await act(async () => {});
      expect(loadFollowers).not.toHaveBeenCalled();
    });

    it('loads the first page and uses the supplied total count', async () => {
      const loadFollowers = jest.fn().mockResolvedValue({
        data: {
          readFollowers: [createFollow('follow-1'), createFollow('follow-2')],
        },
      });
      useLazyQueryMock.mockImplementation(() => [loadFollowers, { loading: false }]);

      const { result } = renderHook(() =>
        usePaginatedFollowers('user-1', 'token', {
          pageSize: 2,
          totalCount: 3,
        }),
      );

      await waitFor(() => expect(result.current.followers).toHaveLength(2));
      expect(result.current.hasMore).toBe(true);
      expect(loadFollowers).toHaveBeenCalledWith({
        context: { headers: { Authorization: 'Bearer token' } },
        variables: {
          options: {
            pagination: { limit: 2, skip: 0 },
            sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
          },
          targetId: 'user-1',
          targetType: FollowTargetType.User,
        },
      });
    });

    it('loads more followers, dedupes follow ids, and stops at the total count', async () => {
      const loadFollowers = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readFollowers: [createFollow('follow-1'), createFollow('follow-2')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            readFollowers: [createFollow('follow-2'), createFollow('follow-3')],
          },
        });
      useLazyQueryMock.mockImplementation(() => [loadFollowers, { loading: false }]);

      const { result } = renderHook(() =>
        usePaginatedFollowers('user-1', 'token', {
          pageSize: 2,
          totalCount: 3,
        }),
      );

      await waitFor(() => expect(result.current.hasMore).toBe(true));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.followers.map((follow) => follow.followId)).toEqual(['follow-1', 'follow-2', 'follow-3']);
      expect(result.current.hasMore).toBe(false);
      expect(loadFollowers).toHaveBeenLastCalledWith({
        context: { headers: { Authorization: 'Bearer token' } },
        variables: {
          options: {
            pagination: { limit: 2, skip: 2 },
            sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
          },
          targetId: 'user-1',
          targetType: FollowTargetType.User,
        },
      });
    });

    it('falls back to page-length based pagination when the total count is unknown', async () => {
      const loadFollowers = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readFollowers: [createFollow('follow-1'), createFollow('follow-2')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            readFollowers: [createFollow('follow-3')],
          },
        });
      useLazyQueryMock.mockImplementation(() => [loadFollowers, { loading: false }]);

      const { result } = renderHook(() => usePaginatedFollowers('user-1', 'token', { pageSize: 2 }));

      await waitFor(() => expect(result.current.hasMore).toBe(true));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.followers.map((follow) => follow.followId)).toEqual(['follow-1', 'follow-2', 'follow-3']);
      expect(result.current.hasMore).toBe(false);
    });

    it('surfaces refresh and load-more errors', async () => {
      const refreshFollowers = jest.fn().mockRejectedValueOnce('bad-refresh');
      useLazyQueryMock.mockImplementation(() => [refreshFollowers, { loading: false }]);

      const { result } = renderHook(() => usePaginatedFollowers('user-1', 'token'));

      await waitFor(() => expect(result.current.error?.message).toBe('Unable to load followers right now.'));
      expect(loggerErrorMock).toHaveBeenCalled();

      const loadMoreError = new Error('load more followers failed');
      const loadFollowers = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readFollowers: [createFollow('follow-1'), createFollow('follow-2')],
          },
        })
        .mockRejectedValueOnce(loadMoreError);
      useLazyQueryMock.mockImplementation(() => [loadFollowers, { loading: false }]);

      const secondHook = renderHook(() =>
        usePaginatedFollowers('user-1', 'token', {
          pageSize: 2,
          totalCount: 4,
        }),
      );

      await waitFor(() => expect(secondHook.result.current.hasMore).toBe(true));

      await act(async () => {
        await secondHook.result.current.loadMore();
      });

      expect(secondHook.result.current.error).toBe(loadMoreError);
      expect(loggerErrorMock).toHaveBeenCalled();
    });
  });

  describe('usePaginatedUserFollowing', () => {
    it('does not request data when disabled or missing a userId', async () => {
      const loadFollowing = jest.fn();
      useLazyQueryMock.mockImplementation(() => [loadFollowing, { loading: false }]);

      const { result, rerender } = renderHook(
        ({ userId, enabled }: { userId?: string; enabled?: boolean }) =>
          usePaginatedUserFollowing(userId, 'token', { enabled }),
        {
          initialProps: { userId: undefined, enabled: true },
        },
      );

      await act(async () => {});
      expect(result.current.following).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(loadFollowing).not.toHaveBeenCalled();

      rerender({ userId: 'user-1', enabled: false });
      await act(async () => {});
      expect(loadFollowing).not.toHaveBeenCalled();
    });

    it('loads following pages, dedupes ids, and advances pagination', async () => {
      const loadFollowing = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readUserFollowing: [createFollow('follow-1'), createFollow('follow-2')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            readUserFollowing: [createFollow('follow-2'), createFollow('follow-3')],
          },
        });
      useLazyQueryMock.mockImplementation(() => [loadFollowing, { loading: false }]);

      const { result } = renderHook(() =>
        usePaginatedUserFollowing('user-1', 'token', {
          pageSize: 2,
          totalCount: 3,
        }),
      );

      await waitFor(() => expect(result.current.hasMore).toBe(true));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.following.map((follow) => follow.followId)).toEqual(['follow-1', 'follow-2', 'follow-3']);
      expect(result.current.hasMore).toBe(false);
      expect(loadFollowing).toHaveBeenNthCalledWith(1, {
        context: { headers: { Authorization: 'Bearer token' } },
        variables: {
          options: {
            pagination: { limit: 2, skip: 0 },
            sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
          },
          userId: 'user-1',
        },
      });
      expect(loadFollowing).toHaveBeenNthCalledWith(2, {
        context: { headers: { Authorization: 'Bearer token' } },
        variables: {
          options: {
            pagination: { limit: 2, skip: 2 },
            sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
          },
          userId: 'user-1',
        },
      });
    });

    it('surfaces refresh and load-more following errors', async () => {
      const refreshFollowing = jest.fn().mockRejectedValueOnce('bad-following-refresh');
      useLazyQueryMock.mockImplementation(() => [refreshFollowing, { loading: false }]);

      const { result } = renderHook(() => usePaginatedUserFollowing('user-1', 'token'));

      await waitFor(() => expect(result.current.error?.message).toBe('Unable to load following right now.'));
      expect(loggerErrorMock).toHaveBeenCalled();

      const loadMoreError = new Error('load more following failed');
      const loadFollowing = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readUserFollowing: [createFollow('follow-1'), createFollow('follow-2')],
          },
        })
        .mockRejectedValueOnce(loadMoreError);
      useLazyQueryMock.mockImplementation(() => [loadFollowing, { loading: false }]);

      const secondHook = renderHook(() =>
        usePaginatedUserFollowing('user-1', 'token', {
          pageSize: 2,
          totalCount: 4,
        }),
      );

      await waitFor(() => expect(secondHook.result.current.hasMore).toBe(true));

      await act(async () => {
        await secondHook.result.current.loadMore();
      });

      expect(secondHook.result.current.error).toBe(loadMoreError);
      expect(loggerErrorMock).toHaveBeenCalled();
    });
  });
});
