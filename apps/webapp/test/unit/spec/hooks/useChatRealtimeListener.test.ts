import { act, renderHook } from '@testing-library/react';
import { useChatRealtimeListener } from '@/hooks/useChatRealtime/useChatRealtimeListener';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

const mockWriteQuery = jest.fn();
const mockRefetchQueries = jest.fn().mockResolvedValue({});
const mockApolloClient = {
  writeQuery: mockWriteQuery,
  refetchQueries: mockRefetchQueries,
};

jest.mock('@apollo/client', () => ({
  useApolloClient: jest.fn(() => mockApolloClient),
}));

// Capture the callbacks passed to useChatRealtime
let capturedChatRealtimeOptions: {
  enabled?: boolean;
  onChatMessage?: () => void;
  onChatRead?: () => void;
  onChatConversationUpdated?: (payload: { unreadTotal: number }) => void;
} = {};

jest.mock('@/hooks/useChatRealtime/useChatRealtime', () => ({
  useChatRealtime: jest.fn((options = {}) => {
    capturedChatRealtimeOptions = options;
  }),
}));

describe('useChatRealtimeListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedChatRealtimeOptions = {};
    mockUseSession.mockReturnValue({
      data: { user: { userId: 'user-1' } },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers useChatRealtime as enabled when a userId exists', () => {
    renderHook(() => useChatRealtimeListener(true));

    expect(capturedChatRealtimeOptions.enabled).toBe(true);
  });

  it('disables useChatRealtime when enabled=false', () => {
    renderHook(() => useChatRealtimeListener(false));

    expect(capturedChatRealtimeOptions.enabled).toBe(false);
  });

  it('disables useChatRealtime when session has no userId', () => {
    mockUseSession.mockReturnValue({ data: { user: { userId: null } } });

    renderHook(() => useChatRealtimeListener(true));

    expect(capturedChatRealtimeOptions.enabled).toBe(false);
  });

  it('schedules a debounced refetch on chat message', async () => {
    renderHook(() => useChatRealtimeListener(true));

    act(() => {
      capturedChatRealtimeOptions.onChatMessage?.();
    });

    expect(mockRefetchQueries).not.toHaveBeenCalled();

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockRefetchQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining(['ReadChatConversations', 'ReadChatMessages']),
      }),
    );
  });

  it('schedules a debounced refetch on chat read', async () => {
    renderHook(() => useChatRealtimeListener(true));

    act(() => {
      capturedChatRealtimeOptions.onChatRead?.();
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockRefetchQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining(['ReadChatConversations', 'ReadChatMessages']),
      }),
    );
  });

  it('batches multiple events into a single refetch', async () => {
    renderHook(() => useChatRealtimeListener(true));

    act(() => {
      capturedChatRealtimeOptions.onChatMessage?.();
      capturedChatRealtimeOptions.onChatRead?.();
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);
  });

  it('writes unreadTotal to apollo cache on chat conversation updated', () => {
    renderHook(() => useChatRealtimeListener(true));

    act(() => {
      capturedChatRealtimeOptions.onChatConversationUpdated?.({ unreadTotal: 7 });
    });

    expect(mockWriteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { unreadChatCount: 7 },
      }),
    );
  });

  it('does not call refetch when no pending state at timer expiry', async () => {
    // Edge case: timer fires but nothing was queued
    renderHook(() => useChatRealtimeListener(true));

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockRefetchQueries).not.toHaveBeenCalled();
  });

  it('clears timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useChatRealtimeListener(true));

    act(() => {
      capturedChatRealtimeOptions.onChatMessage?.();
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
