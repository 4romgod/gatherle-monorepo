import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GetMomentsFeedDocument } from '@data/graphql/query/EventMoment/query';
import type { MobileMomentsFeedMoment } from '@data/graphql/query/EventMoment/types';
import { getApolloAuthContext } from '@/lib/auth';

const FEED_PAGE_SIZE = 12;
const DEFAULT_AUTO_REFRESH_INTERVAL_MS = 20_000;

export function useMomentsFeed(
  authToken: string | null,
  options: {
    autoRefreshIntervalMs?: number;
    enableAutoRefresh?: boolean;
  } = {},
) {
  const { autoRefreshIntervalMs = DEFAULT_AUTO_REFRESH_INTERVAL_MS, enableAutoRefresh = false } = options;
  const [isFetchingMore, setFetchingMore] = useState(false);
  const isFetchingMoreRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const [loadFeed, { called, data, error, fetchMore, loading, refetch }] = useLazyQuery(GetMomentsFeedDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    ...getApolloAuthContext(authToken),
  });

  useEffect(() => {
    void loadFeed({
      variables: {
        limit: FEED_PAGE_SIZE,
      },
    });
  }, [authToken, loadFeed]);

  useEffect(() => {
    isFetchingMoreRef.current = isFetchingMore;
  }, [isFetchingMore]);

  useEffect(() => {
    isLoadingRef.current = loading;
  }, [loading]);

  const moments = useMemo<MobileMomentsFeedMoment[]>(() => data?.readMomentsFeed.items ?? [], [data]);
  const hasMore = data?.readMomentsFeed.hasMore ?? false;
  const nextCursor = data?.readMomentsFeed.nextCursor;

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isFetchingMore) {
      return;
    }

    setFetchingMore(true);
    try {
      await fetchMore({
        variables: {
          cursor: nextCursor,
          limit: FEED_PAGE_SIZE,
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          if (!fetchMoreResult?.readMomentsFeed) {
            return previousResult;
          }

          const seenMomentIds = new Set(
            previousResult.readMomentsFeed.items.map((moment: MobileMomentsFeedMoment) => moment.momentId),
          );
          const mergedItems = [
            ...previousResult.readMomentsFeed.items,
            ...fetchMoreResult.readMomentsFeed.items.filter(
              (moment: MobileMomentsFeedMoment) => !seenMomentIds.has(moment.momentId),
            ),
          ];

          return {
            readMomentsFeed: {
              ...fetchMoreResult.readMomentsFeed,
              items: mergedItems,
            },
          };
        },
      });
    } finally {
      setFetchingMore(false);
    }
  }, [fetchMore, hasMore, isFetchingMore, nextCursor]);

  const refresh = useCallback(async () => {
    if (isLoadingRef.current || isFetchingMoreRef.current || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      if (!called) {
        await loadFeed({
          variables: {
            limit: FEED_PAGE_SIZE,
          },
        });
        return;
      }

      await refetch?.({
        cursor: undefined,
        limit: FEED_PAGE_SIZE,
      });
    } finally {
      isRefreshingRef.current = false;
    }
  }, [called, loadFeed, refetch]);

  useEffect(() => {
    if (!enableAutoRefresh || !called) {
      return;
    }

    void refresh();
    const intervalId = setInterval(() => {
      void refresh();
    }, autoRefreshIntervalMs);

    return () => clearInterval(intervalId);
  }, [autoRefreshIntervalMs, called, enableAutoRefresh, refresh]);

  return {
    error,
    hasMore,
    isFetchingMore,
    loadMore,
    loading,
    moments,
    refresh,
  };
}
