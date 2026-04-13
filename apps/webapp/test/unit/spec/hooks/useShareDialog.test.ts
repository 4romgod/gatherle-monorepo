import { act, renderHook } from '@testing-library/react';
import { useShareDialog } from '@/hooks/useShareDialog';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

const mockSendChatMessage = jest.fn(() => true);

jest.mock('@/hooks', () => ({
  useChatRealtime: jest.fn(() => ({ sendChatMessage: mockSendChatMessage })),
}));

const mockLoadUsers = jest.fn().mockResolvedValue({});

jest.mock('@apollo/client', () => ({
  useLazyQuery: jest.fn(() => [mockLoadUsers, { data: undefined, loading: false }]),
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({ Authorization: 'Bearer tok' })),
}));

jest.mock('@/lib/utils', () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/components/events/share', () => ({
  SEARCH_DEBOUNCE_MS: 220,
  USER_SEARCH_FIELDS: ['username', 'email'],
}));

describe('useShareDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSession.mockReturnValue({
      data: { user: { token: 'tok-1', userId: 'current-user' } },
    });

    const { useLazyQuery } = require('@apollo/client');
    (useLazyQuery as jest.Mock).mockReturnValue([mockLoadUsers, { data: undefined, loading: false }]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initialises with dialog closed', () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );
    expect(result.current.open).toBe(false);
    expect(result.current.users).toEqual([]);
    expect(result.current.selectedUserIds.size).toBe(0);
    expect(result.current.sentUserIds.size).toBe(0);
    expect(result.current.feedbackOpen).toBe(false);
  });

  it('openDialog sets open to true and triggers initial user load', async () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    await act(async () => {
      result.current.openDialog();
    });

    expect(result.current.open).toBe(true);
    expect(mockLoadUsers).toHaveBeenCalled();
  });

  it('closeDialog resets state', async () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    await act(async () => {
      result.current.openDialog();
    });

    act(() => {
      result.current.toggleUserSelection('user-1');
    });

    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.open).toBe(false);
    expect(result.current.searchValue).toBe('');
    expect(result.current.selectedUserIds.size).toBe(0);
  });

  it('toggleUserSelection adds and removes userIds', () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    act(() => {
      result.current.toggleUserSelection('user-1');
    });
    expect(result.current.selectedUserIds.has('user-1')).toBe(true);

    act(() => {
      result.current.toggleUserSelection('user-1');
    });
    expect(result.current.selectedUserIds.has('user-1')).toBe(false);
  });

  it('handleSendSelected does nothing when no users selected', () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    act(() => {
      result.current.handleSendSelected();
    });

    expect(mockSendChatMessage).not.toHaveBeenCalled();
    expect(result.current.feedbackOpen).toBe(false);
  });

  it('handleSendSelected sends messages and shows success feedback', () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    act(() => {
      result.current.toggleUserSelection('user-1');
      result.current.toggleUserSelection('user-2');
    });

    act(() => {
      result.current.handleSendSelected();
    });

    expect(mockSendChatMessage).toHaveBeenCalledTimes(2);
    expect(mockSendChatMessage).toHaveBeenCalledWith('user-1', 'My Event\nhttps://example.com/event');
    expect(result.current.feedbackMessage).toBe('Sent to 2 people.');
    expect(result.current.feedbackOpen).toBe(true);
    expect(result.current.selectedUserIds.size).toBe(0);
    expect(result.current.sentUserIds.has('user-1')).toBe(true);
    expect(result.current.sentUserIds.has('user-2')).toBe(true);
  });

  it('handleSendSelected shows singular feedback for 1 person', () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'Party', resolvedEventUrl: 'https://example.com/party' }),
    );

    act(() => {
      result.current.toggleUserSelection('user-3');
    });

    act(() => {
      result.current.handleSendSelected();
    });

    expect(result.current.feedbackMessage).toBe('Sent to 1 person.');
  });

  it('shows chat not connected feedback when sendChatMessage returns false', () => {
    mockSendChatMessage.mockReturnValueOnce(false);

    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    act(() => {
      result.current.toggleUserSelection('user-1');
    });

    act(() => {
      result.current.handleSendSelected();
    });

    expect(result.current.feedbackMessage).toBe('Chat is not connected yet. Try again in a moment.');
    expect(result.current.sentUserIds.size).toBe(0);
  });

  it('handleCopyLink copies URL and shows feedback', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    await act(async () => {
      await result.current.handleCopyLink();
    });

    expect(writeText).toHaveBeenCalledWith('https://example.com/event');
    expect(result.current.feedbackMessage).toBe('Link copied.');
    expect(result.current.feedbackOpen).toBe(true);
  });

  it('handleCopyLink shows error feedback when clipboard fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    await act(async () => {
      await result.current.handleCopyLink();
    });

    expect(result.current.feedbackMessage).toBe('Unable to copy link.');
  });

  it('closeFeedback closes the feedback snackbar', () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    act(() => {
      result.current.toggleUserSelection('user-1');
    });

    act(() => {
      result.current.handleSendSelected();
    });

    expect(result.current.feedbackOpen).toBe(true);

    act(() => {
      result.current.closeFeedback();
    });

    expect(result.current.feedbackOpen).toBe(false);
  });

  it('filters current user out of the users list', () => {
    const userData = {
      readUsers: [
        { userId: 'current-user', username: 'me' },
        { userId: 'user-2', username: 'other' },
      ],
    };
    const { useLazyQuery } = require('@apollo/client');
    (useLazyQuery as jest.Mock).mockReturnValue([mockLoadUsers, { data: userData, loading: false }]);

    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    expect(result.current.users).toEqual([{ userId: 'user-2', username: 'other' }]);
  });

  it('debounces search value changes to trigger loadShareUsers', async () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    // Open dialog first
    await act(async () => {
      result.current.openDialog();
    });

    mockLoadUsers.mockClear();

    act(() => {
      result.current.setSearchValue('alice');
    });

    // Not called yet (debounced)
    expect(mockLoadUsers).not.toHaveBeenCalled();

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockLoadUsers).toHaveBeenCalled();
  });

  it('does not trigger search reload when dialog is closed', () => {
    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    act(() => {
      result.current.setSearchValue('alice');
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(mockLoadUsers).not.toHaveBeenCalled();
  });

  it('handles loadShareUsers error gracefully', async () => {
    const { logger } = require('@/lib/utils');
    mockLoadUsers.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useShareDialog({ eventTitle: 'My Event', resolvedEventUrl: 'https://example.com/event' }),
    );

    await act(async () => {
      result.current.openDialog();
    });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load share users'), expect.any(Error));
  });
});
