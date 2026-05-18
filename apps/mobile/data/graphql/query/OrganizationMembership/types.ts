import type { GetOrganizationMembershipsByOrgIdQuery } from '../../types/graphql';

export type MobileOrganizationMember =
  GetOrganizationMembershipsByOrgIdQuery['readOrganizationMembershipsByOrgId'][number];
