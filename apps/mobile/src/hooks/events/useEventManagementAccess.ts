import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { canUserManageEvent } from '@gatherle/commons/client/utils';
import { GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { getApolloAuthContext } from '@/lib/auth';

type ManageableEvent = {
  orgId?: string | null;
  organization?: {
    orgId?: string | null;
  } | null;
  organizers?:
    | readonly {
        user?:
          | {
              userId?: string | null;
            }
          | string
          | null;
      }[]
    | null;
};

export function useEventManagementAccess(event: ManageableEvent | null | undefined) {
  const { adminUser, authToken, isAdmin, isAuthenticated, loading: adminLoading, userId } = useAdminAccess();
  const eventOrgId = event?.orgId ?? event?.organization?.orgId ?? null;

  const membershipsQuery = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken || !userId || !eventOrgId || isAdmin,
    ...getApolloAuthContext(authToken),
  });

  const canManageEvent = useMemo(
    () =>
      canUserManageEvent({
        event,
        organizationMemberships: membershipsQuery.data?.readMyOrganizations,
        userId,
        userRole: adminUser?.userRole,
      }),
    [adminUser?.userRole, event, membershipsQuery.data?.readMyOrganizations, userId],
  );

  return {
    canManageEvent,
    loading:
      Boolean(isAuthenticated && authToken && userId && adminLoading) ||
      Boolean(eventOrgId && !isAdmin && membershipsQuery.loading),
  };
}
