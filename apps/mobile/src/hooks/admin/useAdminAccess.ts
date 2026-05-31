import { useQuery } from '@apollo/client';
import { GetUserByIdDocument } from '@data/graphql/query/User/query';
import { UserRole } from '@data/graphql/types/graphql';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { getApolloAuthContext } from '@/lib/auth';

export function useAdminAccess() {
  const { authToken, isAuthenticated, userId } = useAppShell();
  const userQuery = useQuery(GetUserByIdDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken || !userId,
    variables: userId ? { userId } : undefined,
    ...getApolloAuthContext(authToken),
  });

  const user = userQuery.data?.readUserById ?? null;
  const isAdmin = user?.userRole === UserRole.Admin;

  return {
    adminUser: user,
    authToken,
    isAdmin,
    isAuthenticated,
    loading: userQuery.loading,
    refetch: userQuery.refetch,
    userId,
  };
}
