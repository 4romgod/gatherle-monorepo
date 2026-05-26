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

      maybeTrigger();
    },
    [maybeTrigger],
  );

  return {
    onContentSizeChange,
    onScroll,
    scrollEventThrottle: 16 as const,
  };
}
