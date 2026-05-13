import { useQuery } from '@apollo/client';
import { GetUserByUsernameDocument } from '@data/graphql/query/User/query';

export function usePreviewProfile(username: string | null, enabled = true) {
  const { data, error, loading, refetch } = useQuery(GetUserByUsernameDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !enabled || !username,
    variables: {
      username: username ?? '',
    },
  });

  return {
    error,
    loading,
    profile: data?.readUserByUsername ?? null,
    refetch,
  };
}
