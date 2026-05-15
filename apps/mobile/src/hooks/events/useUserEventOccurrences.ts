import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetUserEventOccurrencesDocument } from '@data/graphql/query/EventOccurrenceParticipant/query';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { getApolloAuthContext } from '@/lib/auth';

export function useUserEventOccurrences(userId: string | undefined, authToken: string | null) {
  const { data, error, loading, refetch } = useQuery(GetUserEventOccurrencesDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !userId,
    variables: {
      userId: userId ?? '',
    },
    ...getApolloAuthContext(authToken),
  });

  const occurrences = useMemo<MobileEventOccurrence[]>(() => data?.readUserEventOccurrences ?? [], [data]);

  return {
    error,
    loading,
    occurrences,
    refetch,
  };
}
