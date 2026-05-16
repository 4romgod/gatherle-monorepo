import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GetMomentsFeedDocument } from '@data/graphql/query/EventMoment/query';
import type { MobileMomentsFeedMoment } from '@data/graphql/query/EventMoment/types';
import { getApolloAuthContext } from '@/lib/auth';

const FEED_PAGE_SIZE = 12;

export function useMomentsFeed(authToken: string | null) {
  const [isFetchingMore, setFetchingMore] = useState(false);
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

  const moments = useMemo<MobileMomentsFeedMoment[]>(() => data?.readMomentsFeed.items ?? [], [data]);
  const hasMore = data?.readMomentsFeed.hasMore ?? false;
  const nextCursor = data?.readMomentsFeed.nextCursor;

  const loadMore = async () => {
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
  };

  const refresh = async () => {
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
  };

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
