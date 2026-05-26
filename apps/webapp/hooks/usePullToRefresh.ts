'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UsePullToRefreshOptions = {
  enabled?: boolean;
  maxPullDistance?: number;
  onRefresh: () => Promise<unknown> | unknown;
  threshold?: number;
};

type TouchPoint = {
  x: number;
  y: number;
};

function isTouchCapableDevice() {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function getScrollTop() {
  if (typeof window === 'undefined') {
    return 0;
  }

  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function usePullToRefresh({
  enabled = true,
  maxPullDistance = 108,
  onRefresh,
  threshold = 72,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef<TouchPoint | null>(null);
  const latestOnRefreshRef = useRef(onRefresh);
  const refreshingRef = useRef(false);

  useEffect(() => {
    latestOnRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const resetPull = useCallback(() => {
    pullStartRef.current = null;
    setIsPulling(false);
    setPullDistance(0);
  }, []);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!enabled || isRefreshing || !isTouchCapableDevice() || getScrollTop() > 0) {
        return;
      }

      const touch = event.touches[0];
      pullStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    },
    [enabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!enabled || isRefreshing || !pullStartRef.current) {
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - pullStartRef.current.x;
      const deltaY = touch.clientY - pullStartRef.current.y;

      if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY) || getScrollTop() > 0) {
        if (deltaY <= 0) {
          resetPull();
        }
        return;
      }

      const nextPullDistance = Math.min(maxPullDistance, deltaY * 0.42);
      setIsPulling(true);
      setPullDistance(nextPullDistance);
      event.preventDefault();
    },
    [enabled, isRefreshing, maxPullDistance, resetPull],
  );

  const finishRefresh = useCallback(async () => {
    if (refreshingRef.current) {
      resetPull();
      return;
    }

    const shouldRefresh = pullDistance >= threshold;
    pullStartRef.current = null;
    setIsPulling(false);

    if (!shouldRefresh) {
      setPullDistance(0);
      return;
    }

    refreshingRef.current = true;
    setIsRefreshing(true);
    setPullDistance(threshold);

    try {
      await latestOnRefreshRef.current();
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [pullDistance, resetPull, threshold]);

  const handleTouchEnd = useCallback(() => {
    void finishRefresh();
  }, [finishRefresh]);

  const handleTouchCancel = useCallback(() => {
    void finishRefresh();
  }, [finishRefresh]);

  return {
    handlers: {
      onTouchCancel: handleTouchCancel,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
      onTouchStart: handleTouchStart,
    },
    isPulling,
    isRefreshing,
    pullDistance,
    readyToRefresh: pullDistance >= threshold,
  };
}
