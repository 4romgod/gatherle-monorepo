import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetSavedEventsDocument } from '@data/graphql/query/Follow/query';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { getApolloAuthContext } from '@/lib/auth';
import { mapEventSeriesToOccurrence } from '@/lib/events/adapters';
import {
  buildCollectionPagination,
  sortItemsByEventTime,
  type CollectionQueryPaginationOptions,
} from '@/lib/events/eventCollections';

export function useSavedEvents(authToken?: string | null, options: CollectionQueryPaginationOptions = {}) {
  const { enabled = true, limit, skip } = options;
  const { data, error, loading, refetch } = useQuery(GetSavedEventsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      options: buildCollectionPagination(limit, skip),
    },
    skip: !enabled || !authToken,
    ...getApolloAuthContext(authToken),
  });

  const savedEvents = useMemo(() => {
    const savedSeries = (data?.readSavedEvents ?? []).flatMap((follow) =>
      follow.targetEvent ? [follow.targetEvent] : [],
    );

    const mappedOccurrences = savedSeries
      .map(mapEventSeriesToOccurrence)
      .filter((occurrence): occurrence is MobileEventOccurrence => Boolean(occurrence));

    return sortItemsByEventTime(mappedOccurrences, (occurrence) => occurrence.startAt);
  }, [data]);

  return {
    error,
    loading,
    refetch,
    savedEvents,
  };
}
