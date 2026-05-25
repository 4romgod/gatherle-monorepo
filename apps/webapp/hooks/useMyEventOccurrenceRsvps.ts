'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetMyEventOccurrenceRsvpsDocument } from '@/data/graphql/query/EventOccurrenceParticipant/query';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import {
  buildCollectionPagination,
  splitItemsByEventTime,
  type CollectionQueryPaginationOptions,
} from '@/lib/utils/eventCollections';
import { getAuthHeader } from '@/lib/utils/auth';
import { projectOccurrenceRsvpToEventPreview } from '@/components/events/event-preview-utils';

export function useMyEventOccurrenceRsvps(
  token?: string | null,
  includeCancelled = false,
  options: CollectionQueryPaginationOptions = {},
) {
  const { enabled = true, limit, skip } = options;
  const { data, error, loading, refetch } = useQuery(GetMyEventOccurrenceRsvpsDocument, {
    variables: {
      includeCancelled,
      options: buildCollectionPagination(limit, skip),
    },
    skip: !enabled || !token,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const events = useMemo(
    () =>
      (data?.myEventOccurrenceRsvps ?? [])
        .map(projectOccurrenceRsvpToEventPreview)
        .filter((preview): preview is EventOccurrencePreview => preview != null),
    [data],
  );

  const { past, upcoming } = useMemo(
    () =>
      splitItemsByEventTime(
        events,
        (event) => event.startAt,
        (event) => event.endAt,
      ),
    [events],
  );

  return {
    error,
    events,
    loading,
    pastEvents: past,
    refetch,
    upcomingEvents: upcoming,
  };
}
