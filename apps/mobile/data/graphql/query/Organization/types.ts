import type { GetMyOrganizationsQuery, GetOrganizationsQuery } from '../../types/graphql';

export type MobileDirectoryOrganization = GetOrganizationsQuery['readOrganizations'][number];
export type MobileOrganizationMembership = GetMyOrganizationsQuery['readMyOrganizations'][number];
