'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { canUserManageEvent } from '@gatherle/commons/client/utils';
import { GetMyOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import type { EventDetail } from '@/data/graphql/query/Event/types';
import { UserRole } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';

type ManageableEvent = Pick<EventDetail, 'orgId' | 'organization' | 'organizers'> | null | undefined;

export function useEventManagementAccess(event: ManageableEvent) {
  const { data: session, status } = useSession();
  const token = session?.user?.token;
  const viewerUserId = session?.user?.userId;
  const viewerUserRole = session?.user?.userRole;
  const eventOrgId = event?.orgId ?? event?.organization?.orgId ?? null;
  const isGlobalAdmin = viewerUserRole === UserRole.Admin;

  const membershipsQuery = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !token || !viewerUserId || !eventOrgId || isGlobalAdmin,
    context: { headers: getAuthHeader(token) },
  });

  const canManageEvent = useMemo(
    () =>
      canUserManageEvent({
        event,
        organizationMemberships: membershipsQuery.data?.readMyOrganizations,
        userId: viewerUserId,
        userRole: viewerUserRole,
      }),
    [event, membershipsQuery.data?.readMyOrganizations, viewerUserId, viewerUserRole],
  );

  return {
    canManageEvent,
    loading: status === 'loading' || Boolean(eventOrgId && !isGlobalAdmin && membershipsQuery.loading),
  };
}
