import { act, renderHook } from '@testing-library/react-native';
import { useKeyboardAwareField } from '@/hooks/core/useKeyboardAwareField';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';

const mockScrollToInput = jest.fn();
let mockKeyboardAwareScroll: { scrollToInput: jest.Mock } | null = { scrollToInput: mockScrollToInput };

jest.mock('@/components/core/KeyboardAwareScrollView', () => ({
  useKeyboardAwareScroll: () => mockKeyboardAwareScroll,
}));

describe('mobile core hooks', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockScrollToInput.mockClear();
    mockKeyboardAwareScroll = { scrollToInput: mockScrollToInput };
  });

  it('runs pull-to-refresh actions and resets refreshing after success', async () => {
    const refreshAction = jest.fn(async () => 'done');
    const { result } = renderHook(() => usePullToRefresh(refreshAction));

    expect(result.current.refreshing).toBe(false);

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(refreshAction).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(false);
  });

  it('prevents overlapping refresh calls and still resets after failure', async () => {
    let rejectRefresh!: (error: Error) => void;
    const refreshAction = jest.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectRefresh = reject;
        }),
    );
    const { result } = renderHook(() => usePullToRefresh(refreshAction));

    let firstRefresh!: Promise<void>;
    await act(async () => {
      firstRefresh = result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(true);

    await act(async () => {
      await result.current.onRefresh();
    });
    expect(refreshAction).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectRefresh(new Error('refresh failed'));
      await expect(firstRefresh).rejects.toThrow('refresh failed');
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('scrolls the focused field after the keyboard-aware delay', () => {
    jest.useFakeTimers();
    const { result, unmount } = renderHook(() => useKeyboardAwareField());
    const input = { focus: jest.fn() };

    result.current.inputRef.current = input as never;

    act(() => {
      result.current.handleFocus();
    });
    expect(mockScrollToInput).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(mockScrollToInput).toHaveBeenCalledWith(input);

    unmount();
    jest.useRealTimers();
  });

  it('replaces a pending keyboard-aware focus timer when focus fires repeatedly', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useKeyboardAwareField());
    const input = { focus: jest.fn() };
    result.current.inputRef.current = input as never;

    act(() => {
      result.current.handleFocus();
      result.current.handleFocus();
      jest.advanceTimersByTime(60);
    });

    expect(mockScrollToInput).toHaveBeenCalledTimes(1);
    expect(mockScrollToInput).toHaveBeenCalledWith(input);
    jest.useRealTimers();
  });

  it('does nothing when rendered outside a keyboard-aware scroll context', () => {
    jest.useFakeTimers();
    mockKeyboardAwareScroll = null;
    const { result } = renderHook(() => useKeyboardAwareField());

    act(() => {
      result.current.handleFocus();
      jest.advanceTimersByTime(60);
    });

    expect(mockScrollToInput).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('clears pending keyboard-aware focus timers on unmount', () => {
    jest.useFakeTimers();
    const { result, unmount } = renderHook(() => useKeyboardAwareField());

    act(() => {
      result.current.handleFocus();
    });
    unmount();
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockScrollToInput).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
