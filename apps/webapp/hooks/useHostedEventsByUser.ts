'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GetEventsCountDocument, GetEventsDocument } from '@/data/graphql/query/Event/query';
import type { EventPreview } from '@/data/graphql/query/Event/types';
import { SortOrderInput } from '@/data/graphql/types/graphql';
import { buildHostedEventsCountQueryOptions, buildHostedEventsQueryOptions } from '@/lib/utils/eventCollections';
import { getAuthHeader } from '@/lib/utils/auth';
import { logger } from '@/lib/utils';

const PAGE_SIZE = 18;

type UseHostedEventsOptions = {
  enabled?: boolean;
  pageSize?: number;
  searchTerm?: string;
};

export function useHostedEventsByUser(
  userId: string | undefined,
  token?: string | null,
  options: UseHostedEventsOptions = {},
) {
  const { enabled = true, pageSize = PAGE_SIZE, searchTerm = '' } = options;
  const [events, setEvents] = useState<EventPreview[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(0);
  const eventsRef = useRef<EventPreview[]>([]);
  const totalCountKnownRef = useRef(false);

  const [loadEvents, { loading }] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });
  const [loadEventsCount] = useLazyQuery(GetEventsCountDocument, {
    fetchPolicy: 'network-only',
  });

  const loadPage = useCallback(
    async (page: number) => {
      if (!userId) {
        return [];
      }

      const response = await loadEvents({
        context: { headers: getAuthHeader(token) },
        variables: {
          options: buildHostedEventsQueryOptions(userId, SortOrderInput.Desc, pageSize, page * pageSize, searchTerm),
        },
      });

      return (response.data?.readEvents ?? []) as EventPreview[];
    },
    [loadEvents, pageSize, searchTerm, token, userId],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setEvents([]);
      setHasMore(false);
      setTotalCount(0);
      setError(null);
      pageRef.current = 0;
      totalCountKnownRef.current = false;
      return;
    }

    try {
      setError(null);
      pageRef.current = 0;
      const [pageResult, countResult] = await Promise.allSettled([
        loadPage(0),
        loadEventsCount({
          context: { headers: getAuthHeader(token) },
          variables: {
            options: buildHostedEventsCountQueryOptions(userId, searchTerm),
          },
        }),
      ]);

      if (pageResult.status !== 'fulfilled') {
        throw pageResult.reason;
      }

      const page = pageResult.value;
      const nextTotalCount = countResult.status === 'fulfilled' ? countResult.value.data?.readEventsCount : undefined;
      const hasReliableTotalCount = typeof nextTotalCount === 'number';

      if (countResult.status === 'rejected') {
        logger.warn('Failed to load hosted events count for user profile', countResult.reason);
      }

      totalCountKnownRef.current = hasReliableTotalCount;
      eventsRef.current = page;
      setEvents(page);
      setTotalCount(hasReliableTotalCount ? nextTotalCount : page.length);
      setHasMore(hasReliableTotalCount ? page.length < nextTotalCount : page.length >= pageSize);
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load hosted events right now.');
      logger.error('Failed to load hosted events for user profile', resolvedError);
      setError(resolvedError);
      eventsRef.current = [];
      setEvents([]);
      setHasMore(false);
      setTotalCount(0);
      totalCountKnownRef.current = false;
    }
  }, [enabled, loadEventsCount, loadPage, pageSize, searchTerm, token, userId]);

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
      const existingIds = new Set(eventsRef.current.map((event) => event.eventId));
      const nextEvents = [...eventsRef.current, ...page.filter((event) => !existingIds.has(event.eventId))];
      eventsRef.current = nextEvents;
      setEvents(nextEvents);
      setHasMore(totalCountKnownRef.current ? nextEvents.length < totalCount : page.length >= pageSize);
      pageRef.current = nextPage;
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load more hosted events right now.');
      logger.error('Failed to load more hosted events for user profile', resolvedError);
      setError(resolvedError);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, pageSize, totalCount, userId]);

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
