import { act, renderHook } from '@testing-library/react';
import { useMessageScroll } from '@/hooks/useMessageScroll';

describe('useMessageScroll', () => {
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    rafCallback = null;

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const makeContainer = (overrides?: Partial<HTMLDivElement>) => {
    const container = {
      scrollHeight: 1000,
      scrollTop: 904,
      clientHeight: 100,
      scrollIntoView: jest.fn(),
      ...overrides,
    } as unknown as HTMLDivElement;
    return container;
  };

  const makeBottom = () => ({ scrollIntoView: jest.fn() }) as unknown as HTMLDivElement;

  it('returns refs and initial state', () => {
    const { result } = renderHook(() => useMessageScroll({ targetUserId: 'user-1', messagesLength: 0 }));

    expect(result.current.messageListRef).toBeDefined();
    expect(result.current.messagesBottomRef).toBeDefined();
    expect(result.current.showJumpToLatest).toBe(false);
    expect(typeof result.current.updateScrollStickiness).toBe('function');
    expect(typeof result.current.scrollToLatest).toBe('function');
  });

  it('updateScrollStickiness does nothing when messageListRef is null', () => {
    const { result } = renderHook(() => useMessageScroll({ targetUserId: 'user-1', messagesLength: 0 }));

    // ref is null by default in test environment
    act(() => {
      result.current.updateScrollStickiness();
    });

    expect(result.current.showJumpToLatest).toBe(false);
  });

  it('updateScrollStickiness sets showJumpToLatest true when far from bottom', () => {
    const { result } = renderHook(() => useMessageScroll({ targetUserId: 'user-1', messagesLength: 0 }));

    const container = makeContainer({ scrollTop: 0 }); // far from bottom
    Object.defineProperty(result.current.messageListRef, 'current', {
      value: container,
      writable: true,
    });

    act(() => {
      result.current.updateScrollStickiness();
    });

    expect(result.current.showJumpToLatest).toBe(true);
  });

  it('updateScrollStickiness sets showJumpToLatest false when near bottom', () => {
    const { result } = renderHook(() => useMessageScroll({ targetUserId: 'user-1', messagesLength: 0 }));

    const container = makeContainer({ scrollTop: 910 }); // very close to bottom
    Object.defineProperty(result.current.messageListRef, 'current', {
      value: container,
      writable: true,
    });

    act(() => {
      result.current.updateScrollStickiness();
    });

    expect(result.current.showJumpToLatest).toBe(false);
  });

  it('scrollToLatest calls scrollIntoView on messagesBottomRef', () => {
    const { result } = renderHook(() => useMessageScroll({ targetUserId: 'user-1', messagesLength: 0 }));

    const bottom = makeBottom();
    Object.defineProperty(result.current.messagesBottomRef, 'current', {
      value: bottom,
      writable: true,
    });
    // also set container so updateScrollStickiness works
    const container = makeContainer({ scrollTop: 910 });
    Object.defineProperty(result.current.messageListRef, 'current', {
      value: container,
      writable: true,
    });

    act(() => {
      result.current.scrollToLatest();
    });

    expect(bottom.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' });
    expect(result.current.showJumpToLatest).toBe(false);
  });

  it('scrollToLatest accepts custom scroll behavior', () => {
    const { result } = renderHook(() => useMessageScroll({ targetUserId: 'user-1', messagesLength: 0 }));

    const bottom = makeBottom();
    Object.defineProperty(result.current.messagesBottomRef, 'current', {
      value: bottom,
      writable: true,
    });
    const container = makeContainer({ scrollTop: 910 });
    Object.defineProperty(result.current.messageListRef, 'current', {
      value: container,
      writable: true,
    });

    act(() => {
      result.current.scrollToLatest('instant');
    });

    expect(bottom.scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'end' });
  });

  it('resets to bottom via rAF when targetUserId changes', () => {
    const { result, rerender } = renderHook(
      ({ targetUserId, messagesLength }: { targetUserId: string; messagesLength: number }) =>
        useMessageScroll({ targetUserId, messagesLength }),
      { initialProps: { targetUserId: 'user-1', messagesLength: 3 } },
    );

    // Rerender first — before assigning refs so the auto-scroll effect
    // fires but finds no ref.current and does nothing.
    act(() => {
      rerender({ targetUserId: 'user-2', messagesLength: 3 });
    });

    // Assign refs after rerender so the pending rAF callback can use them.
    const bottom = makeBottom();
    Object.defineProperty(result.current.messagesBottomRef, 'current', {
      value: bottom,
      writable: true,
    });
    const container = makeContainer({ scrollTop: 910 });
    Object.defineProperty(result.current.messageListRef, 'current', {
      value: container,
      writable: true,
    });

    // rAF not yet fired
    expect(bottom.scrollIntoView).not.toHaveBeenCalled();

    // Fire rAF
    act(() => {
      if (rafCallback) rafCallback(0);
    });

    expect(bottom.scrollIntoView).toHaveBeenCalledWith({ block: 'end' });
  });

  it('cancels rAF on cleanup when targetUserId changes again', () => {
    const { rerender, unmount } = renderHook(
      ({ targetUserId }: { targetUserId: string }) => useMessageScroll({ targetUserId, messagesLength: 0 }),
      { initialProps: { targetUserId: 'user-1' } },
    );

    act(() => {
      rerender({ targetUserId: 'user-2' });
    });

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it('does not fire rAF effect when targetUserId is undefined', () => {
    renderHook(() => useMessageScroll({ targetUserId: undefined, messagesLength: 0 }));

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('shows jump to latest when new messages arrive and user is not at bottom', () => {
    const { result, rerender } = renderHook(
      ({ messagesLength }: { messagesLength: number }) => useMessageScroll({ targetUserId: 'user-1', messagesLength }),
      { initialProps: { messagesLength: 1 } },
    );

    // Simulate user scrolling up (not sticky)
    const container = makeContainer({ scrollTop: 0 }); // far from bottom
    Object.defineProperty(result.current.messageListRef, 'current', {
      value: container,
      writable: true,
    });
    act(() => {
      result.current.updateScrollStickiness(); // sets shouldStickToBottom=false
    });

    act(() => {
      rerender({ messagesLength: 2 });
    });

    expect(result.current.showJumpToLatest).toBe(true);
  });

  it('auto-scrolls when new messages arrive and user is at bottom', () => {
    const { result, rerender } = renderHook(
      ({ messagesLength }: { messagesLength: number }) => useMessageScroll({ targetUserId: 'user-1', messagesLength }),
      { initialProps: { messagesLength: 1 } },
    );

    // User is near bottom (sticky by default)
    const bottom = makeBottom();
    Object.defineProperty(result.current.messagesBottomRef, 'current', {
      value: bottom,
      writable: true,
    });

    act(() => {
      rerender({ messagesLength: 2 });
    });

    expect(bottom.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' });
  });

  it('does not auto-scroll when targetUserId is undefined', () => {
    const { result, rerender } = renderHook(
      ({ messagesLength }: { messagesLength: number }) => useMessageScroll({ targetUserId: undefined, messagesLength }),
      { initialProps: { messagesLength: 1 } },
    );

    const bottom = makeBottom();
    Object.defineProperty(result.current.messagesBottomRef, 'current', {
      value: bottom,
      writable: true,
    });

    act(() => {
      rerender({ messagesLength: 2 });
    });

    expect(bottom.scrollIntoView).not.toHaveBeenCalled();
  });
});
