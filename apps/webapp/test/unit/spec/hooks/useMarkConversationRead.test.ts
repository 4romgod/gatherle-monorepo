import { act, renderHook } from '@testing-library/react';
import { useMarkConversationRead } from '@/hooks/useMarkConversationRead';

const mockRefetchQueries = jest.fn().mockResolvedValue([]);

jest.mock('@apollo/client', () => ({
  useApolloClient: () => ({ refetchQueries: mockRefetchQueries }),
}));

jest.mock('@/lib/utils', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const setDocumentHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
};

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  targetUserId: 'user-b' as string | null | undefined,
  currentUserId: 'user-a' as string | null,
  markConversationReadMutation: jest.fn().mockResolvedValue({}),
  markConversationReadRealtime: jest.fn(),
  ...overrides,
});

describe('useMarkConversationRead', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    setDocumentHidden(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    setDocumentHidden(false);
  });

  describe('debouncing', () => {
    it('does not call the mutation before the 150 ms window elapses', () => {
      const props = makeProps();
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.advanceTimersByTime(149);
      });

      expect(props.markConversationReadMutation).not.toHaveBeenCalled();
    });

    it('calls the mutation exactly once after 150 ms', () => {
      const props = makeProps();
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(props.markConversationReadMutation).toHaveBeenCalledTimes(1);
      expect(props.markConversationReadMutation).toHaveBeenCalledWith('user-b');
    });

    it('calls the realtime handler in the same debounce flush', () => {
      const props = makeProps();
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(props.markConversationReadRealtime).toHaveBeenCalledTimes(1);
      expect(props.markConversationReadRealtime).toHaveBeenCalledWith('user-b');
    });

    it('ignores a second schedule call while a timer is already pending', () => {
      const props = makeProps();
      // Mount triggers the first schedule; calling the returned fn again is a no-op
      const { result } = renderHook(() => useMarkConversationRead(props));

      act(() => {
        result.current(); // second call — timer already set, should be ignored
        jest.advanceTimersByTime(150);
      });

      expect(props.markConversationReadMutation).toHaveBeenCalledTimes(1);
    });

    it('allows re-scheduling after the previous timer has fired', () => {
      const props = makeProps();
      const { result } = renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.advanceTimersByTime(150); // first timer fires
      });
      act(() => {
        result.current(); // schedule again now that ref is clear
        jest.advanceTimersByTime(150);
      });

      expect(props.markConversationReadMutation).toHaveBeenCalledTimes(2);
    });

    it('triggers refetchQueries after the mutation resolves', async () => {
      const props = makeProps();
      renderHook(() => useMarkConversationRead(props));

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(mockRefetchQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining(['ReadChatConversations', 'GetUnreadChatCount']),
        }),
      );
    });
  });

  describe('document.hidden guard', () => {
    it('does not schedule when document is hidden at mount time', () => {
      setDocumentHidden(true);
      const props = makeProps();
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.runAllTimers();
      });

      expect(props.markConversationReadMutation).not.toHaveBeenCalled();
    });

    it('does not schedule when the returned fn is called while document is hidden', () => {
      const props = makeProps();
      const { result } = renderHook(() => useMarkConversationRead(props));

      // Let the mount-triggered timer fire first
      act(() => {
        jest.advanceTimersByTime(150);
      });

      setDocumentHidden(true);
      act(() => {
        result.current();
        jest.runAllTimers();
      });

      // Only the first (visible) call should have gone through
      expect(props.markConversationReadMutation).toHaveBeenCalledTimes(1);
    });
  });

  describe('timer cleanup on unmount', () => {
    it('cancels the pending timer when the hook unmounts before 150 ms', () => {
      const props = makeProps();
      const { unmount } = renderHook(() => useMarkConversationRead(props));

      act(() => {
        unmount(); // clears the timer
        jest.runAllTimers(); // nothing left to fire
      });

      expect(props.markConversationReadMutation).not.toHaveBeenCalled();
    });

    it('removes the visibilitychange listener on unmount', () => {
      const removeSpy = jest.spyOn(document, 'removeEventListener');
      const props = makeProps();
      const { unmount } = renderHook(() => useMarkConversationRead(props));

      act(() => {
        unmount();
      });

      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  describe('visibilitychange', () => {
    it('schedules a read when the tab becomes visible', () => {
      // Start hidden so the mount schedule is skipped
      setDocumentHidden(true);
      const props = makeProps();
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.runAllTimers(); // confirm nothing fired yet
      });
      expect(props.markConversationReadMutation).not.toHaveBeenCalled();

      // Tab becomes visible
      setDocumentHidden(false);
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        jest.advanceTimersByTime(150);
      });

      expect(props.markConversationReadMutation).toHaveBeenCalledTimes(1);
    });

    it('does not schedule when visibilitychange fires but the tab is still hidden', () => {
      setDocumentHidden(true);
      const props = makeProps();
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        document.dispatchEvent(new Event('visibilitychange')); // still hidden
        jest.runAllTimers();
      });

      expect(props.markConversationReadMutation).not.toHaveBeenCalled();
    });
  });

  describe('guard conditions', () => {
    it('does nothing when targetUserId is null', () => {
      const props = makeProps({ targetUserId: null });
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.runAllTimers();
      });

      expect(props.markConversationReadMutation).not.toHaveBeenCalled();
    });

    it('does nothing when targetUserId is undefined', () => {
      const props = makeProps({ targetUserId: undefined });
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.runAllTimers();
      });

      expect(props.markConversationReadMutation).not.toHaveBeenCalled();
    });

    it('does nothing when currentUserId is null', () => {
      const props = makeProps({ currentUserId: null });
      renderHook(() => useMarkConversationRead(props));

      act(() => {
        jest.runAllTimers();
      });

      expect(props.markConversationReadMutation).not.toHaveBeenCalled();
    });
  });
});
