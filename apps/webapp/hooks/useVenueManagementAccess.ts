'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { GetMyOrganizationsDocument, GetOrganizationsDocument } from '@/data/graphql/query';
import { OrganizationRole, UserRole } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';

export function useVenueManagementAccess() {
  const { data: session, status } = useSession();
  const token = session?.user?.token;
  const isAuthenticated = Boolean(token);
  const isGlobalAdmin = session?.user?.userRole === UserRole.Admin;

  const membershipsQuery = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
    context: { headers: getAuthHeader(token) },
  });

  const adminOrganizationsQuery = useQuery(GetOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !isGlobalAdmin,
    context: { headers: getAuthHeader(token) },
  });

  const manageableOrganizations = useMemo(() => {
    if (isGlobalAdmin) {
      return (adminOrganizationsQuery.data?.readOrganizations ?? []).map((organization) => ({
        orgId: organization.orgId,
        name: organization.name,
        role: UserRole.Admin,
      }));
    }

    return (membershipsQuery.data?.readMyOrganizations ?? [])
      .filter((membership) => membership.role === OrganizationRole.Owner || membership.role === OrganizationRole.Admin)
      .map((membership) => ({
        orgId: membership.organization.orgId,
        name: membership.organization.name,
        role: membership.role,
      }));
  }, [adminOrganizationsQuery.data?.readOrganizations, isGlobalAdmin, membershipsQuery.data?.readMyOrganizations]);

  const manageableOrganizationIds = useMemo(
    () => new Set(manageableOrganizations.map((organization) => organization.orgId)),
    [manageableOrganizations],
  );

  return {
    canCreateVenue: isGlobalAdmin || manageableOrganizations.length > 0,
    canManageVenue: (venueOrgId?: string | null) =>
      isGlobalAdmin || Boolean(venueOrgId && manageableOrganizationIds.has(venueOrgId)),
    isGlobalAdmin,
    loading:
      status === 'loading' ||
      membershipsQuery.loading ||
      (isGlobalAdmin && adminOrganizationsQuery.loading && manageableOrganizations.length === 0),
    manageableOrganizations,
  };
}
