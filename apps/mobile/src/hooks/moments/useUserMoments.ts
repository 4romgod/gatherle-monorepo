import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetUserMomentsDocument } from '@data/graphql/query/EventMoment/query';
import type { MobileUserMoment } from '@data/graphql/query/EventMoment/types';
import { getApolloAuthContext } from '@/lib/auth';

export function useUserMoments(userId: string | undefined, authToken: string | null) {
  const { data, error, loading, refetch } = useQuery(GetUserMomentsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !userId,
    variables: {
      userId: userId ?? '',
      limit: 24,
    },
    ...getApolloAuthContext(authToken),
  });

  const moments = useMemo<MobileUserMoment[]>(() => data?.readUserMoments.items ?? [], [data]);

  return {
    error,
    loading,
    moments,
    refetch,
  };
}
