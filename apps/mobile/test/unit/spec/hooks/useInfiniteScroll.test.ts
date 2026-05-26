import { act, renderHook } from '@testing-library/react-native';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';

function createScrollEvent({
  contentHeight,
  offsetY,
  viewportHeight,
}: {
  contentHeight: number;
  offsetY: number;
  viewportHeight: number;
}) {
  return {
    nativeEvent: {
      contentOffset: { y: offsetY },
      contentSize: { height: contentHeight, width: 0 },
      layoutMeasurement: { height: viewportHeight, width: 0 },
    },
  } as never;
}

describe('mobile useInfiniteScroll', () => {
  it('triggers when the scroll position reaches the bottom threshold', () => {
    const onEndReached = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        enabled: true,
        onEndReached,
      }),
    );

    act(() => {
      result.current.onScroll(
        createScrollEvent({
          contentHeight: 1000,
          offsetY: 650,
          viewportHeight: 200,
        }),
      );
    });

    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it('dedupes repeated triggers for the same content height until the content grows', () => {
    const onEndReached = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        enabled: true,
        onEndReached,
      }),
    );

    act(() => {
      result.current.onScroll(
        createScrollEvent({
          contentHeight: 1000,
          offsetY: 700,
          viewportHeight: 100,
        }),
      );
      result.current.onScroll(
        createScrollEvent({
          contentHeight: 1000,
          offsetY: 700,
          viewportHeight: 100,
        }),
      );
    });

    expect(onEndReached).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.onContentSizeChange(0, 1020);
    });

    expect(onEndReached).toHaveBeenCalledTimes(2);
  });

  it('does not trigger while disabled or loading', () => {
    const onEndReached = jest.fn();
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
      result.current.onScroll(
        createScrollEvent({
          contentHeight: 1000,
          offsetY: 700,
          viewportHeight: 100,
        }),
      );
    });

    rerender({ enabled: true, loading: true });

    act(() => {
      result.current.onScroll(
        createScrollEvent({
          contentHeight: 1000,
          offsetY: 700,
          viewportHeight: 100,
        }),
      );
    });

    expect(onEndReached).not.toHaveBeenCalled();
  });
});
