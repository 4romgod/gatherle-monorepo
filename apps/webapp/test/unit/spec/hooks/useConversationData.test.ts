import { act, renderHook } from '@testing-library/react';
import { useConversationData } from '@/hooks/useConversationData';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(),
  useApolloClient: jest.fn(),
  gql: jest.fn((strings: TemplateStringsArray) => strings.join('')),
}));

jest.mock('@/hooks', () => ({
  useChatConversations: jest.fn(),
  useChatMessages: jest.fn(),
  useResolveConversationUsers: jest.fn(),
}));

jest.mock('@/components/messages/chatUiUtils', () => ({
  resolveChatIdentity: jest.fn(({ givenName, familyName, username }) => {
    if (givenName || familyName) return `${givenName ?? ''} ${familyName ?? ''}`.trim();
    return `@${username}`;
  }),
}));

const { useQuery: useQueryMock } = require('@apollo/client');
const {
  useChatConversations: useChatConversationsMock,
  useChatMessages: useChatMessagesMock,
  useResolveConversationUsers: useResolveConversationUsersMock,
} = require('@/hooks');

const defaultConversationsResult = {
  conversations: [],
  loading: false,
  error: undefined,
};
const defaultMessagesResult = {
  messages: [],
  loading: false,
  error: undefined,
};

describe('useConversationData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { userId: 'current-user', token: 'token' } },
    });
    useChatConversationsMock.mockReturnValue(defaultConversationsResult);
    useChatMessagesMock.mockReturnValue(defaultMessagesResult);
    useResolveConversationUsersMock.mockReturnValue({});
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined });
  });

  it('returns null currentUserId when session is absent', () => {
    mockUseSession.mockReturnValue({ data: null });

    const { result } = renderHook(() => useConversationData('alice'));

    expect(result.current.currentUserId).toBeNull();
  });

  it('returns currentUserId from session', () => {
    const { result } = renderHook(() => useConversationData('alice'));

    expect(result.current.currentUserId).toBe('current-user');
  });

  it('passes username to GetUserByUsername query', () => {
    renderHook(() => useConversationData('bob'));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { username: 'bob' },
      }),
    );
  });

  it('returns target user data when query resolves', () => {
    useQueryMock.mockReturnValue({
      data: {
        readUserByUsername: {
          userId: 'target-1',
          username: 'bob',
          given_name: 'Bob',
          family_name: 'Smith',
        },
      },
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useConversationData('bob'));

    expect(result.current.targetUser?.userId).toBe('target-1');
    expect(result.current.targetUserId).toBe('target-1');
  });

  it('passes targetUserId to useChatMessages', () => {
    useQueryMock.mockReturnValue({
      data: { readUserByUsername: { userId: 'target-1', username: 'bob' } },
      loading: false,
      error: undefined,
    });

    renderHook(() => useConversationData('bob'));

    expect(useChatMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({ withUserId: 'target-1', markAsRead: true }),
    );
  });

  it('resolves displayIdentity with name when available', () => {
    useQueryMock.mockReturnValue({
      data: {
        readUserByUsername: {
          userId: 'target-1',
          username: 'bob',
          given_name: 'Bob',
          family_name: 'Smith',
        },
      },
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useConversationData('bob'));

    expect(result.current.displayIdentity).toBe('Bob Smith');
  });

  it('falls back to username in displayIdentity when no name', () => {
    useQueryMock.mockReturnValue({
      data: {
        readUserByUsername: {
          userId: 'target-1',
          username: 'charlie',
          given_name: null,
          family_name: null,
        },
      },
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useConversationData('charlie'));

    expect(result.current.displayIdentity).toBe('@charlie');
  });

  it('falls back to the passed username when targetUser is undefined', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true, error: undefined });

    const { result } = renderHook(() => useConversationData('dave'));

    expect(result.current.displayIdentity).toBe('@dave');
  });

  it('returns loading and error states from all sub-hooks', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true, error: new Error('user error') });
    useChatConversationsMock.mockReturnValue({
      conversations: [],
      loading: true,
      error: new Error('conv error'),
    });
    useChatMessagesMock.mockReturnValue({
      messages: [],
      loading: true,
      error: new Error('msg error'),
    });

    const { result } = renderHook(() => useConversationData('alice'));

    expect(result.current.targetUserLoading).toBe(true);
    expect(result.current.targetUserError).toEqual(new Error('user error'));
    expect(result.current.conversationsLoading).toBe(true);
    expect(result.current.conversationsError).toEqual(new Error('conv error'));
    expect(result.current.messagesLoading).toBe(true);
    expect(result.current.messagesError).toEqual(new Error('msg error'));
  });

  it('forwards resolvedUsersByConversationId', () => {
    const resolved = { 'conv-1': { displayName: 'Alice' } };
    useResolveConversationUsersMock.mockReturnValue(resolved);

    const { result } = renderHook(() => useConversationData('alice'));

    expect(result.current.resolvedUsersByConversationId).toBe(resolved);
  });

  it('passes conversations to useResolveConversationUsers', () => {
    const conversations = [{ conversationWithUserId: 'user-2' }];
    useChatConversationsMock.mockReturnValue({
      conversations,
      loading: false,
      error: undefined,
    });

    renderHook(() => useConversationData('alice'));

    expect(useResolveConversationUsersMock).toHaveBeenCalledWith(conversations);
  });
});
