import { useQuery } from '@apollo/client';
import { GetUserProfileDocument } from '@data/graphql/query/User/query';
import { getApolloAuthContext } from '@/lib/auth';

export function useAccountProfile(username: string | null, authToken: string | null, enabled = true) {
  const { data, error, loading, refetch } = useQuery(GetUserProfileDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !enabled || !username,
    variables: {
      username: username ?? '',
    },
    ...getApolloAuthContext(authToken),
  });

  return {
    error,
    loading,
    profile: data?.readUserByUsername ?? null,
    refetch,
  };
}
