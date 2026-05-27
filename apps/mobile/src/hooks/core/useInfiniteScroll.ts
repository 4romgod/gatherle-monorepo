import { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type UseInfiniteScrollOptions = {
  enabled: boolean;
  loading?: boolean;
  onEndReached: () => void;
  resetKey?: string;
  threshold?: number;
};

export function useInfiniteScroll({
  enabled,
  loading = false,
  onEndReached,
  resetKey,
  threshold = 240,
}: UseInfiniteScrollOptions) {
  const metricsRef = useRef({
    contentHeight: 0,
    offsetY: 0,
    viewportHeight: 0,
  });
  // Remembers which rendered content height already triggered pagination so
  // appended rows/spinners do not recursively load more without a new scroll.
  const lastTriggeredContentHeightRef = useRef<number | null>(null);

  const maybeTrigger = useCallback(() => {
    if (!enabled || loading) {
      return;
    }

    const { contentHeight, offsetY, viewportHeight } = metricsRef.current;
    if (!contentHeight || !viewportHeight) {
      return;
    }

    const distanceToBottom = contentHeight - (offsetY + viewportHeight);
    if (distanceToBottom > threshold || lastTriggeredContentHeightRef.current === contentHeight) {
      return;
    }

    lastTriggeredContentHeightRef.current = contentHeight;
    onEndReached();
  }, [enabled, loading, onEndReached, threshold]);

  useEffect(() => {
    lastTriggeredContentHeightRef.current = null;
  }, [enabled, resetKey]);

  useEffect(() => {
    maybeTrigger();
  }, [maybeTrigger]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      metricsRef.current = {
        contentHeight: event.nativeEvent.contentSize.height,
        offsetY: event.nativeEvent.contentOffset.y,
        viewportHeight: event.nativeEvent.layoutMeasurement.height,
      };

      maybeTrigger();
    },
    [maybeTrigger],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      metricsRef.current = {
        ...metricsRef.current,
        contentHeight: height,
      };

      // Avoid retriggering pagination purely because the list grew while the
      // user is still parked at the bottom. A fresh scroll gesture should be
      // what requests the next page after appended content renders.
      if (lastTriggeredContentHeightRef.current === null) {
        maybeTrigger();
      }
    },
    [maybeTrigger],
  );

  return {
    onContentSizeChange,
    onScroll,
    scrollEventThrottle: 16 as const,
  };
}
