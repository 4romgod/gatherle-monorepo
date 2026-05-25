import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetMyEventOccurrenceRsvpsDocument } from '@data/graphql/query/EventOccurrenceParticipant/query';
import type { MobileRsvpOccurrence } from '@data/graphql/query/EventOccurrenceParticipant/types';
import { getApolloAuthContext } from '@/lib/auth';
import {
  buildCollectionPagination,
  splitItemsByEventTime,
  type CollectionQueryPaginationOptions,
} from '@/lib/events/eventCollections';

export function useMyEventOccurrenceRsvps(
  authToken?: string | null,
  includeCancelled = false,
  options: CollectionQueryPaginationOptions = {},
) {
  const { enabled = true, limit, skip } = options;
  const { data, error, loading, refetch } = useQuery(GetMyEventOccurrenceRsvpsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      includeCancelled,
      options: buildCollectionPagination(limit, skip),
    },
    skip: !enabled || !authToken,
    ...getApolloAuthContext(authToken),
  });

  const events = useMemo(
    () =>
      (data?.myEventOccurrenceRsvps ?? [])
        .map((rsvp) => rsvp.occurrence)
        .filter((occurrence): occurrence is MobileRsvpOccurrence => Boolean(occurrence)),
    [data],
  );

  const { past, upcoming } = useMemo(
    () =>
      splitItemsByEventTime(
        events,
        (occurrence) => occurrence.startAt,
        (occurrence) => occurrence.endAt,
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
