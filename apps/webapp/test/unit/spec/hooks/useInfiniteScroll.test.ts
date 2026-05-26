import { act, renderHook } from '@testing-library/react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

describe('useInfiniteScroll', () => {
  let callback: IntersectionObserverCallback | null = null;
  const observe = jest.fn();
  const disconnect = jest.fn();

  beforeEach(() => {
    callback = null;
    observe.mockReset();
    disconnect.mockReset();

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];

      constructor(nextCallback: IntersectionObserverCallback) {
        callback = nextCallback;
      }

      disconnect = disconnect;
      observe = observe;
      takeRecords = () => [];
      unobserve = jest.fn();
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: MockIntersectionObserver,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('observes the sentinel and triggers when it intersects', () => {
    const onEndReached = jest.fn();
    const sentinel = document.createElement('div');
    const { result } = renderHook(() =>
      useInfiniteScroll({
        enabled: true,
        onEndReached,
      }),
    );

    act(() => {
      result.current(sentinel);
    });

    expect(observe).toHaveBeenCalledWith(sentinel);

    act(() => {
      callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it('does not trigger while disabled or already loading', () => {
    const onEndReached = jest.fn();
    const sentinel = document.createElement('div');
    const { result, rerender } = renderHook(
      ({ enabled, loading }: { enabled: boolean; loading: boolean }) =>
        useInfiniteScroll({
          enabled,
          loading,
          onEndReached,
        }),
      {
        initialProps: {
          enabled: false,
          loading: false,
        },
      },
    );

    act(() => {
      result.current(sentinel);
    });

    act(() => {
      callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    rerender({ enabled: true, loading: true });

    act(() => {
      callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(onEndReached).not.toHaveBeenCalled();
  });

  it('disconnects the previous observer when the target changes', () => {
    const firstSentinel = document.createElement('div');
    const secondSentinel = document.createElement('div');
    const { result } = renderHook(() =>
      useInfiniteScroll({
        enabled: true,
        onEndReached: jest.fn(),
      }),
    );

    act(() => {
      result.current(firstSentinel);
      result.current(secondSentinel);
    });

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenLastCalledWith(secondSentinel);
  });
});
