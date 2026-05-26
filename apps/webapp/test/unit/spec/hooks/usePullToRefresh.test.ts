import { act, renderHook, waitFor } from '@testing-library/react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

type TouchEventLike = {
  preventDefault: jest.Mock;
  touches: Array<{
    clientX: number;
    clientY: number;
  }>;
};

function createTouchEvent(clientX: number, clientY: number): TouchEventLike {
  return {
    preventDefault: jest.fn(),
    touches: [{ clientX, clientY }],
  };
}

function setTouchSupport({ maxTouchPoints, ontouchstart }: { maxTouchPoints: number; ontouchstart: boolean }) {
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: maxTouchPoints,
  });

  if (ontouchstart) {
    Object.defineProperty(window, 'ontouchstart', {
      configurable: true,
      value: jest.fn(),
    });
    return;
  }

  delete (window as typeof window & { ontouchstart?: unknown }).ontouchstart;
}

function setScrollTop(windowScrollY: number, documentScrollTop = 0) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: windowScrollY,
    writable: true,
  });
  Object.defineProperty(document.documentElement, 'scrollTop', {
    configurable: true,
    value: documentScrollTop,
    writable: true,
  });
}

describe('usePullToRefresh', () => {
  beforeEach(() => {
    setTouchSupport({ maxTouchPoints: 1, ontouchstart: false });
    setScrollTop(0, 0);
  });

  afterEach(() => {
    delete (window as typeof window & { ontouchstart?: unknown }).ontouchstart;
  });

  it('ignores touch start when disabled, unsupported, or not at the top of the page', () => {
    const onRefresh = jest.fn();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePullToRefresh({
          enabled,
          onRefresh,
        }),
      {
        initialProps: { enabled: false },
      },
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0, 0) as any);
    });
    expect(result.current.isPulling).toBe(false);
    expect(result.current.pullDistance).toBe(0);

    rerender({ enabled: true });
    setTouchSupport({ maxTouchPoints: 0, ontouchstart: false });
    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0, 0) as any);
    });
    expect(result.current.isPulling).toBe(false);

    setTouchSupport({ maxTouchPoints: 1, ontouchstart: false });
    setScrollTop(24, 0);
    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0, 0) as any);
    });
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(0, 120) as any);
    });
    expect(result.current.isPulling).toBe(false);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('treats ontouchstart support as touch capable and tracks a vertical pull', () => {
    setTouchSupport({ maxTouchPoints: 0, ontouchstart: true });

    const { result } = renderHook(() =>
      usePullToRefresh({
        maxPullDistance: 50,
        onRefresh: jest.fn(),
        threshold: 20,
      }),
    );

    const startEvent = createTouchEvent(4, 8);
    const moveEvent = createTouchEvent(4, 108);

    act(() => {
      result.current.handlers.onTouchStart(startEvent as any);
    });
    act(() => {
      result.current.handlers.onTouchMove(moveEvent as any);
    });

    expect(result.current.isPulling).toBe(true);
    expect(result.current.pullDistance).toBe(42);
    expect(result.current.readyToRefresh).toBe(true);
    expect(moveEvent.preventDefault).toHaveBeenCalled();
  });

  it('ignores horizontal drags and resets when the gesture moves upward', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({
        onRefresh: jest.fn(),
      }),
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0, 0) as any);
    });

    const horizontalMove = createTouchEvent(60, 10);
    act(() => {
      result.current.handlers.onTouchMove(horizontalMove as any);
    });
    expect(result.current.isPulling).toBe(false);
    expect(horizontalMove.preventDefault).not.toHaveBeenCalled();

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0, 50) as any);
    });
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(0, 20) as any);
    });

    expect(result.current.isPulling).toBe(false);
    expect(result.current.pullDistance).toBe(0);
  });

  it('ends a short pull without refreshing', async () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() =>
      usePullToRefresh({
        maxPullDistance: 80,
        onRefresh,
        threshold: 30,
      }),
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0, 0) as any);
    });
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(0, 20) as any);
    });

    act(() => {
      result.current.handlers.onTouchEnd();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.isPulling).toBe(false);
    expect(result.current.pullDistance).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('refreshes once the pull crosses the threshold and resets after completion', async () => {
    let resolveRefresh: (() => void) | undefined;
    const onRefresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const { result } = renderHook(() =>
      usePullToRefresh({
        maxPullDistance: 100,
        onRefresh,
        threshold: 20,
      }),
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0, 0) as any);
    });
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(0, 100) as any);
    });
    act(() => {
      result.current.handlers.onTouchEnd();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    expect(result.current.pullDistance).toBe(20);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      resolveRefresh?.();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.pullDistance).toBe(0);
    expect(result.current.readyToRefresh).toBe(false);
  });

  it('uses touch cancel for refresh completion and ignores duplicate refresh attempts while one is in flight', async () => {
    let resolveRefresh: (() => void) | undefined;
    const onRefresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const { result } = renderHook(() =>
      usePullToRefresh({
        maxPullDistance: 100,
        onRefresh,
        threshold: 20,
      }),
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0, 0) as any);
    });
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(0, 100) as any);
    });
    act(() => {
      result.current.handlers.onTouchCancel();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true));

    act(() => {
      result.current.handlers.onTouchEnd();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      resolveRefresh?.();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
  });
});
