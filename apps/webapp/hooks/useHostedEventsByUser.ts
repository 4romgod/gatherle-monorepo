'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GetEventsDocument } from '@/data/graphql/query/Event/query';
import type { EventPreview } from '@/data/graphql/query/Event/types';
import { SortOrderInput } from '@/data/graphql/types/graphql';
import { buildHostedEventsQueryOptions } from '@/lib/utils/eventCollections';
import { getAuthHeader } from '@/lib/utils/auth';
import { logger } from '@/lib/utils';

const PAGE_SIZE = 18;

type UseHostedEventsOptions = {
  enabled?: boolean;
  pageSize?: number;
};

export function useHostedEventsByUser(
  userId: string | undefined,
  token?: string | null,
  options: UseHostedEventsOptions = {},
) {
  const { enabled = true, pageSize = PAGE_SIZE } = options;
  const [events, setEvents] = useState<EventPreview[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(0);

  const [loadEvents, { loading }] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  const loadPage = useCallback(
    async (page: number) => {
      if (!userId) {
        return [];
      }

      const response = await loadEvents({
        context: { headers: getAuthHeader(token) },
        variables: {
          options: buildHostedEventsQueryOptions(userId, SortOrderInput.Desc, pageSize, page * pageSize),
        },
      });

      return (response.data?.readEvents ?? []) as EventPreview[];
    },
    [loadEvents, pageSize, token, userId],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setEvents([]);
      setHasMore(false);
      setError(null);
      pageRef.current = 0;
      return;
    }

    try {
      setError(null);
      pageRef.current = 0;
      const page = await loadPage(0);
      setEvents(page);
      setHasMore(page.length >= pageSize);
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load hosted events right now.');
      logger.error('Failed to load hosted events for user profile', resolvedError);
      setError(resolvedError);
      setEvents([]);
      setHasMore(false);
    }
  }, [enabled, loadPage, pageSize, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const page = await loadPage(nextPage);
      setEvents((current) => {
        const existingIds = new Set(current.map((event) => event.eventId));
        return [...current, ...page.filter((event) => !existingIds.has(event.eventId))];
      });
      setHasMore(page.length >= pageSize);
      pageRef.current = nextPage;
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load more hosted events right now.');
      logger.error('Failed to load more hosted events for user profile', resolvedError);
      setError(resolvedError);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, loadingMore, pageSize, userId]);

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
    }),
    [error, events, hasMore, loading, loadingMore, loadMore, refresh],
  );
}
