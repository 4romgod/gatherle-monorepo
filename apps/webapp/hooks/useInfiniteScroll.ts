import { useCallback, useEffect, useRef } from 'react';

type UseInfiniteScrollOptions = {
  enabled: boolean;
  loading?: boolean;
  onEndReached: () => void;
  rootMargin?: string;
};

export function useInfiniteScroll({
  enabled,
  loading = false,
  onEndReached,
  rootMargin = '0px 0px 960px 0px',
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const latestEnabledRef = useRef(enabled);
  const latestLoadingRef = useRef(loading);
  const latestOnEndReachedRef = useRef(onEndReached);

  useEffect(() => {
    latestEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    latestLoadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    latestOnEndReachedRef.current = onEndReached;
  }, [onEndReached]);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return useCallback(
    (node: Element | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!node || typeof IntersectionObserver === 'undefined') {
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;

          if (!entry?.isIntersecting || !latestEnabledRef.current || latestLoadingRef.current) {
            return;
          }

          latestOnEndReachedRef.current();
        },
        { rootMargin },
      );

      observerRef.current.observe(node);
    },
    [rootMargin],
  );
}
