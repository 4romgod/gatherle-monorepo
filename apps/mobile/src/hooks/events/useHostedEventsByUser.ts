import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GetEventsCountDocument, GetEventsDocument } from '@data/graphql/query/Event/query';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { MobileEventSeriesListItem } from '@data/graphql/query/Event/types';
import { SortOrderInput } from '@data/graphql/types/graphql';
import { getApolloAuthContext } from '@/lib/auth';
import { mapEventSeriesToOccurrence } from '@/lib/events/adapters';
import { buildHostedEventsCountQueryOptions, buildHostedEventsQueryOptions } from '@/lib/events/eventCollections';

const PAGE_SIZE = 18;

type UseHostedEventsOptions = {
  enabled?: boolean;
  pageSize?: number;
};

export function useHostedEventsByUser(
  userId: string | undefined,
  authToken: string | null,
  options: UseHostedEventsOptions = {},
) {
  const { enabled = true, pageSize = PAGE_SIZE } = options;
  const [events, setEvents] = useState<MobileEventOccurrence[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(0);

  const [loadEvents, { loading }] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });
  const [loadEventsCount] = useLazyQuery(GetEventsCountDocument, {
    fetchPolicy: 'network-only',
  });

  const mapSeriesPage = useCallback(
    (items: readonly MobileEventSeriesListItem[]) =>
      items.map(mapEventSeriesToOccurrence).filter((value): value is MobileEventOccurrence => Boolean(value)),
    [],
  );

  const loadPage = useCallback(
    async (page: number) => {
      if (!userId) {
        return [];
      }

      const response = await loadEvents({
        context: getApolloAuthContext(authToken),
        variables: {
          options: buildHostedEventsQueryOptions(userId, SortOrderInput.Desc, pageSize, page * pageSize),
        },
      });

      return (response.data?.readEvents ?? []) as MobileEventSeriesListItem[];
    },
    [authToken, loadEvents, pageSize, userId],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setEvents([]);
      setHasMore(false);
      setTotalCount(0);
      setError(null);
      pageRef.current = 0;
      return;
    }

    try {
      setError(null);
      pageRef.current = 0;
      const [page, countResponse] = await Promise.all([
        loadPage(0),
        loadEventsCount({
          context: getApolloAuthContext(authToken),
          variables: {
            options: buildHostedEventsCountQueryOptions(userId),
          },
        }),
      ]);
      const nextTotalCount = countResponse.data?.readEventsCount ?? 0;
      setEvents(mapSeriesPage(page));
      setTotalCount(nextTotalCount);
      setHasMore(page.length < nextTotalCount);
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load hosted events right now.');
      console.error('Failed to load hosted events for user profile', resolvedError);
      setError(resolvedError);
      setEvents([]);
      setHasMore(false);
      setTotalCount(0);
    }
  }, [authToken, enabled, loadEventsCount, loadPage, mapSeriesPage, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMoreRef.current || !hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const page = await loadPage(nextPage);
      const mappedPage = mapSeriesPage(page);
      let nextEventCount = 0;
      setEvents((current) => {
        const existingIds = new Set(current.map((event) => event.occurrenceId));
        const nextEvents = [...current, ...mappedPage.filter((event) => !existingIds.has(event.occurrenceId))];
        nextEventCount = nextEvents.length;
        return nextEvents;
      });
      setHasMore(totalCount > 0 ? nextEventCount < totalCount : page.length >= pageSize);
      pageRef.current = nextPage;
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load more hosted events right now.');
      console.error('Failed to load more hosted events for user profile', resolvedError);
      setError(resolvedError);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, mapSeriesPage, pageSize, totalCount, userId]);

  return useMemo(
    () => ({
      error,
      events,
      hostedEvents: events,
      hasMore,
      loading,
      loadingMore,
      loadMore,
      refetch: refresh,
      totalCount,
    }),
    [error, events, hasMore, loading, loadingMore, loadMore, refresh, totalCount],
  );
}
