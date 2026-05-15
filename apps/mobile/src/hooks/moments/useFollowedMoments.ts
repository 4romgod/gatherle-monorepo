import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetFollowedMomentsDocument } from '@data/graphql/query/EventMoment/query';
import type { MobileFollowedMoment } from '@data/graphql/query/EventMoment/types';
import { getApolloAuthContext } from '@/lib/auth';

export function useFollowedMoments(authToken: string | null) {
  const { data, error, loading, refetch } = useQuery(GetFollowedMomentsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !authToken,
    variables: {
      limit: 60,
    },
    ...getApolloAuthContext(authToken),
  });

  const moments = useMemo<MobileFollowedMoment[]>(() => data?.readFollowedMoments.items ?? [], [data]);

  return {
    error,
    loading,
    moments,
    refetch,
  };
}
