import { useQuery } from '@apollo/client';
import { GetUserByIdDocument } from '@data/graphql/query/User/query';
import { getApolloAuthContext } from '@/lib/auth';

export function usePreviewProfile(userId: string | null, authToken: string | null, enabled = true) {
  const { data, error, loading, refetch } = useQuery(GetUserByIdDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !enabled || !userId,
    variables: {
      userId: userId ?? '',
    },
    ...getApolloAuthContext(authToken),
  });

  return {
    error,
    loading,
    profile: data?.readUserById ?? null,
    refetch,
  };
}
