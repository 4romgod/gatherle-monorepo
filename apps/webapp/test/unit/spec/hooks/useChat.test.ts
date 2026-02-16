import { act, renderHook } from '@testing-library/react';
import { useChatActions, useChatConversations, useChatMessages, useUnreadChatCount } from '@/hooks/useChat';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  __esModule: true,
  getAuthHeader: jest.fn(() => ({ Authorization: 'Bearer token' })),
}));

const { useMutation: useMutationMock, useQuery: useQueryMock } = require('@apollo/client');
const { getAuthHeader: getAuthHeaderMock } = require('@/lib/utils');

describe('useChat hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ data: { user: { token: 'token-1' } } });
  });

  it('useChatConversations skips query when token is missing', () => {
    mockUseSession.mockReturnValue({ data: null });
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: jest.fn() });

    renderHook(() => useChatConversations({ limit: 10 }));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { limit: 10 },
        skip: true,
      }),
    );
  });

  it('useChatConversations returns defaults and uses auth header when token exists', () => {
    const refetch = jest.fn();
    useQueryMock.mockReturnValue({ data: undefined, loading: true, error: undefined, refetch });

    const { result } = renderHook(() => useChatConversations({ limit: 10 }));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { limit: 10 },
        skip: false,
      }),
    );
    expect(getAuthHeaderMock).toHaveBeenCalledWith('token-1');
    expect(result.current.conversations).toEqual([]);
    expect(result.current.refetch).toBe(refetch);
  });

  it('useChatMessages loadMore calls fetchMore with expected variables', async () => {
    const fetchMore = jest.fn().mockResolvedValue({});

    useQueryMock.mockReturnValue({
      data: {
        readChatMessages: {
          messages: [{ chatMessageId: 'm1' }],
          nextCursor: 'cursor-1',
          hasMore: true,
          count: 1,
        },
      },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
      fetchMore,
    });

    const { result } = renderHook(() =>
      useChatMessages({
        withUserId: 'user-2',
        limit: 25,
        markAsRead: true,
      }),
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchMore).toHaveBeenCalledWith({
      variables: {
        withUserId: 'user-2',
        cursor: 'cursor-1',
        limit: 25,
        markAsRead: false,
      },
      updateQuery: expect.any(Function),
    });

    const updateQuery = fetchMore.mock.calls[0][0].updateQuery;
    const merged = updateQuery(
      {
        readChatMessages: {
          messages: [{ chatMessageId: 'existing' }],
          nextCursor: 'cursor-1',
          hasMore: true,
          count: 1,
        },
      },
      {
        fetchMoreResult: {
          readChatMessages: {
            messages: [{ chatMessageId: 'new' }],
            nextCursor: 'cursor-2',
            hasMore: false,
            count: 2,
          },
        },
      },
    );

    expect(merged.readChatMessages.messages).toEqual([{ chatMessageId: 'existing' }, { chatMessageId: 'new' }]);

    const unchanged = updateQuery(
      {
        readChatMessages: {
          messages: [{ chatMessageId: 'existing' }],
          nextCursor: 'cursor-1',
          hasMore: true,
          count: 1,
        },
      },
      {
        fetchMoreResult: undefined,
      },
    );
    expect(unchanged.readChatMessages.messages).toEqual([{ chatMessageId: 'existing' }]);
  });

  it('useChatMessages loadMore returns early when pagination is not available', async () => {
    const fetchMore = jest.fn().mockResolvedValue({});

    useQueryMock.mockReturnValue({
      data: {
        readChatMessages: {
          messages: [],
          nextCursor: null,
          hasMore: false,
          count: 0,
        },
      },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
      fetchMore,
    });

    const { result } = renderHook(() => useChatMessages({ withUserId: 'user-2' }));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchMore).not.toHaveBeenCalled();
  });

  it('useChatMessages skips query when withUserId is missing and returns defaults', () => {
    useQueryMock.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });

    const { result } = renderHook(() => useChatMessages({ withUserId: null }));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: {
          withUserId: '',
          limit: 50,
          markAsRead: true,
        },
        skip: true,
      }),
    );
    expect(result.current.messages).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('useUnreadChatCount reads unread count and does not poll', () => {
    useQueryMock.mockReturnValue({
      data: { unreadChatCount: 7 },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUnreadChatCount());

    expect(result.current.unreadCount).toBe(7);
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: false,
      }),
    );
  });

  it('useUnreadChatCount skips query when auth token is missing', () => {
    mockUseSession.mockReturnValue({ data: null });
    useQueryMock.mockReturnValue({
      data: { unreadChatCount: 0 },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    renderHook(() => useUnreadChatCount());

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: true,
      }),
    );
  });

  it('useChatActions calls mark conversation read mutation', async () => {
    const markConversationReadMutation = jest.fn().mockResolvedValue({ data: { markChatConversationRead: 2 } });
    useMutationMock.mockReturnValue([markConversationReadMutation, { loading: false }]);

    const { result } = renderHook(() => useChatActions());

    await act(async () => {
      await result.current.markConversationRead('user-2');
    });

    expect(getAuthHeaderMock).toHaveBeenCalledWith('token-1');
    expect(markConversationReadMutation).toHaveBeenCalledWith({
      variables: { withUserId: 'user-2' },
      context: {
        headers: { Authorization: 'Bearer token' },
      },
      refetchQueries: ['ReadChatConversations', 'ReadChatMessages', 'GetUnreadChatCount'],
      awaitRefetchQueries: true,
    });
  });

  it('useChatActions exposes loading state from mutation', () => {
    useMutationMock.mockReturnValue([jest.fn(), { loading: true }]);

    const { result } = renderHook(() => useChatActions());

    expect(result.current.markConversationReadLoading).toBe(true);
  });
});
