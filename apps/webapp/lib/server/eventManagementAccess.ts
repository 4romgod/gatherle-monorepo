import { canUserManageEvent } from '@gatherle/commons/client/utils';
import { getClient } from '@/data/graphql';
import type { EventDetail } from '@/data/graphql/query/Event/types';
import { GetMyOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import { getAuthHeader } from '@/lib/utils/auth';

type ManageableEvent = Pick<EventDetail, 'orgId' | 'organization' | 'organizers'> | null | undefined;

type LoadServerEventManagementAccessArgs = {
  event: ManageableEvent;
  token?: string | null;
  userId?: string | null;
  userRole?: string | null;
};

export async function loadServerEventManagementAccess({
  event,
  token,
  userId,
  userRole,
}: LoadServerEventManagementAccessArgs): Promise<boolean> {
  if (!event || !userId) {
    return false;
  }

  const eventOrgId = event.orgId ?? event.organization?.orgId ?? null;

  const organizationMemberships =
    eventOrgId && token && userRole !== 'Admin'
      ? (
          await getClient().query({
            query: GetMyOrganizationsDocument,
            context: { headers: getAuthHeader(token) },
            fetchPolicy: 'no-cache',
          })
        ).data.readMyOrganizations
      : undefined;

  return canUserManageEvent({
    event,
    organizationMemberships,
    userId,
    userRole,
  });
}
