'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetSavedEventsDocument } from '@/data/graphql/query/Follow/query';
import type { EventPreview } from '@/data/graphql/query/Event/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { getEventPreviewStartAt } from '@/components/events/event-preview-utils';
import {
  buildCollectionPagination,
  sortItemsByEventTime,
  type CollectionQueryPaginationOptions,
} from '@/lib/utils/eventCollections';

export function useSavedEvents(token?: string | null, options: CollectionQueryPaginationOptions = {}) {
  const { enabled = true, limit, skip } = options;
  const { data, error, loading, refetch } = useQuery(GetSavedEventsDocument, {
    variables: {
      options: buildCollectionPagination(limit, skip),
    },
    skip: !enabled || !token,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const savedEvents = useMemo(() => {
    const events = (data?.readSavedEvents ?? [])
      .map((follow) => follow.targetEvent)
      .filter((event): event is EventPreview => Boolean(event));

    return sortItemsByEventTime(events, (event) => getEventPreviewStartAt(event));
  }, [data]);

  return {
    error,
    loading,
    refetch,
    savedEvents,
  };
}
