import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetEventsDocument } from '@data/graphql/query';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { EventsQueryOptionsInput } from '@data/graphql/types/graphql';
import { getApolloAuthContext } from '@/lib/auth';
import { mapEventSeriesToOccurrence } from '@/lib/events/adapters';

export function usePublicEvents(options: EventsQueryOptionsInput | undefined, authToken: string | null) {
  const { data, error, loading, refetch } = useQuery(GetEventsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      options,
    },
    ...getApolloAuthContext(authToken),
  });

  const occurrences = useMemo<MobileEventOccurrence[]>(
    () =>
      (data?.readEvents ?? [])
        .map(mapEventSeriesToOccurrence)
        .filter((value): value is MobileEventOccurrence => Boolean(value)),
    [data?.readEvents],
  );

  return {
    error,
    loading,
    occurrences,
    refetch,
  };
}
