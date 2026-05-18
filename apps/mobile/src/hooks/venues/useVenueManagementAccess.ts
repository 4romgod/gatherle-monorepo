import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetMyOrganizationsDocument, GetOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { GetUserByIdDocument } from '@data/graphql/query/User/query';
import { OrganizationRole, UserRole } from '@data/graphql/types/graphql';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { getApolloAuthContext } from '@/lib/auth';

type ManageableOrganization = {
  orgId: string;
  name: string;
  role: OrganizationRole | UserRole.Admin;
};

export function useVenueManagementAccess() {
  const { authToken, isAuthenticated, userId } = useAppShell();
  const userQuery = useQuery(GetUserByIdDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken || !userId,
    variables: { userId: userId ?? '' },
    ...getApolloAuthContext(authToken),
  });

  const membershipsQuery = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });

  const isGlobalAdmin = userQuery.data?.readUserById?.userRole === UserRole.Admin;

  const adminOrganizationsQuery = useQuery(GetOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken || !isGlobalAdmin,
    ...getApolloAuthContext(authToken),
  });

  const manageableMemberships = useMemo(
    () =>
      (membershipsQuery.data?.readMyOrganizations ?? []).filter(
        (membership) => membership.role === OrganizationRole.Owner || membership.role === OrganizationRole.Admin,
      ),
    [membershipsQuery.data?.readMyOrganizations],
  );

  const manageableOrganizations = useMemo<ManageableOrganization[]>(() => {
    if (isGlobalAdmin) {
      return (adminOrganizationsQuery.data?.readOrganizations ?? []).map((organization) => ({
        orgId: organization.orgId,
        name: organization.name,
        role: UserRole.Admin,
      }));
    }

    return manageableMemberships.map((membership) => ({
      orgId: membership.organization.orgId,
      name: membership.organization.name,
      role: membership.role,
    }));
  }, [adminOrganizationsQuery.data?.readOrganizations, isGlobalAdmin, manageableMemberships]);

  const manageableOrganizationIds = useMemo(
    () => new Set(manageableOrganizations.map((organization) => organization.orgId)),
    [manageableOrganizations],
  );

  return {
    canCreateVenue: isGlobalAdmin || manageableOrganizations.length > 0,
    canManageVenue: (venueOrgId?: string | null) =>
      isGlobalAdmin || Boolean(venueOrgId && manageableOrganizationIds.has(venueOrgId)),
    isGlobalAdmin,
    loading: userQuery.loading || membershipsQuery.loading || adminOrganizationsQuery.loading,
    manageableOrganizations,
  };
}
