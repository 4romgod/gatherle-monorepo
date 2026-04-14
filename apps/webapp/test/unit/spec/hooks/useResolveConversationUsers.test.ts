import { act, renderHook } from '@testing-library/react';
import { useResolveConversationUsers } from '@/hooks/useResolveConversationUsers';

const mockApolloClient = {
  query: jest.fn(),
};

jest.mock('@apollo/client', () => ({
  useApolloClient: jest.fn(() => mockApolloClient),
}));

type Conversation = {
  conversationWithUserId: string;
  conversationWithUser?: {
    username?: string | null;
    given_name?: string | null;
    family_name?: string | null;
    profile_picture?: string | null;
  } | null;
};

describe('useResolveConversationUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty map when no conversations', () => {
    const { result } = renderHook(() => useResolveConversationUsers([]));
    expect(result.current).toEqual({});
  });

  it('skips conversations that already have username embedded', async () => {
    const conversations: Conversation[] = [
      {
        conversationWithUserId: 'user-1',
        conversationWithUser: { username: 'alice', given_name: 'Alice', family_name: 'Smith' },
      },
    ];

    const { result } = renderHook(() => useResolveConversationUsers(conversations));

    await act(async () => {});

    expect(mockApolloClient.query).not.toHaveBeenCalled();
    expect(result.current).toEqual({});
  });

  it('fetches and resolves user with full name', async () => {
    const conversations: Conversation[] = [{ conversationWithUserId: 'user-1', conversationWithUser: null }];

    mockApolloClient.query.mockResolvedValue({
      data: {
        readUserById: {
          userId: 'user-1',
          given_name: 'John',
          family_name: 'Doe',
          username: 'johndoe',
          profile_picture: 'https://example.com/pic.jpg',
        },
      },
    });

    const { result } = renderHook(() => useResolveConversationUsers(conversations));

    await act(async () => {});

    expect(result.current['user-1']).toEqual({
      displayName: 'John Doe',
      username: 'johndoe',
      avatarSrc: 'https://example.com/pic.jpg',
    });
  });

  it('falls back to @username when no name', async () => {
    const conversations: Conversation[] = [{ conversationWithUserId: 'user-2', conversationWithUser: null }];

    mockApolloClient.query.mockResolvedValue({
      data: {
        readUserById: {
          userId: 'user-2',
          given_name: null,
          family_name: null,
          username: 'janedoe',
          profile_picture: null,
        },
      },
    });

    const { result } = renderHook(() => useResolveConversationUsers(conversations));

    await act(async () => {});

    expect(result.current['user-2']).toEqual({
      displayName: '@janedoe',
      username: 'janedoe',
      avatarSrc: undefined,
    });
  });

  it('falls back to Conversation display name when no name or username', async () => {
    const conversations: Conversation[] = [{ conversationWithUserId: 'user-3', conversationWithUser: null }];

    mockApolloClient.query.mockResolvedValue({
      data: {
        readUserById: {
          userId: 'user-3',
          given_name: null,
          family_name: null,
          username: null,
          profile_picture: 'https://example.com/avatar.jpg',
        },
      },
    });

    const { result } = renderHook(() => useResolveConversationUsers(conversations));

    await act(async () => {});

    expect(result.current['user-3']).toEqual({
      displayName: 'Conversation',
      avatarSrc: 'https://example.com/avatar.jpg',
    });
  });

  it('falls back to Conversation when readUserById is null', async () => {
    const conversations: Conversation[] = [{ conversationWithUserId: 'user-4', conversationWithUser: null }];

    mockApolloClient.query.mockResolvedValue({
      data: { readUserById: null },
    });

    const { result } = renderHook(() => useResolveConversationUsers(conversations));

    await act(async () => {});

    expect(result.current['user-4']).toEqual({ displayName: 'Conversation' });
  });

  it('falls back to Conversation when query throws', async () => {
    const conversations: Conversation[] = [{ conversationWithUserId: 'user-5', conversationWithUser: null }];

    mockApolloClient.query.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useResolveConversationUsers(conversations));

    await act(async () => {});

    expect(result.current['user-5']).toEqual({ displayName: 'Conversation' });
  });

  it('does not re-fetch users already resolved', async () => {
    const conversations: Conversation[] = [{ conversationWithUserId: 'user-1', conversationWithUser: null }];

    mockApolloClient.query.mockResolvedValue({
      data: {
        readUserById: {
          userId: 'user-1',
          given_name: 'Alice',
          family_name: null,
          username: 'alice',
          profile_picture: null,
        },
      },
    });

    const { result, rerender } = renderHook(
      ({ convs }: { convs: Conversation[] }) => useResolveConversationUsers(convs),
      { initialProps: { convs: conversations } },
    );

    await act(async () => {});

    expect(mockApolloClient.query).toHaveBeenCalledTimes(1);

    // Re-render with same conversations
    act(() => {
      rerender({ convs: conversations });
    });

    await act(async () => {});

    // Should not query again — already resolved
    expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
  });

  it('resolves multiple users in parallel', async () => {
    const conversations: Conversation[] = [
      { conversationWithUserId: 'user-A', conversationWithUser: null },
      { conversationWithUserId: 'user-B', conversationWithUser: null },
    ];

    mockApolloClient.query
      .mockResolvedValueOnce({
        data: {
          readUserById: {
            userId: 'user-A',
            given_name: 'Alice',
            family_name: 'A',
            username: 'alice',
            profile_picture: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          readUserById: {
            userId: 'user-B',
            given_name: 'Bob',
            family_name: 'B',
            username: 'bob',
            profile_picture: null,
          },
        },
      });

    const { result } = renderHook(() => useResolveConversationUsers(conversations));

    await act(async () => {});

    expect(result.current['user-A'].displayName).toBe('Alice A');
    expect(result.current['user-B'].displayName).toBe('Bob B');
    expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
  });

  it('uses @username display when user has no full name but has a username', async () => {
    const conversations: Conversation[] = [{ conversationWithUserId: 'user-7', conversationWithUser: null }];

    mockApolloClient.query.mockResolvedValueOnce({
      data: {
        readUserById: {
          userId: 'user-7',
          given_name: null,
          family_name: null,
          username: 'ghost',
          profile_picture: 'https://cdn.example.com/ghost.jpg',
        },
      },
    });

    const { result } = renderHook(() => useResolveConversationUsers(conversations));

    await act(async () => {});

    expect(result.current['user-7']).toEqual({
      displayName: '@ghost',
      username: 'ghost',
      avatarSrc: 'https://cdn.example.com/ghost.jpg',
    });
  });
});
