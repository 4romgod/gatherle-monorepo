import type { GetMyOrganizationsQuery, GetOrganizationByIdQuery, GetOrganizationsQuery } from '../../types/graphql';

export type MobileDirectoryOrganization = GetOrganizationsQuery['readOrganizations'][number];
export type MobileOrganizationMembership = GetMyOrganizationsQuery['readMyOrganizations'][number];
export type MobileOrganizationProfile = NonNullable<GetOrganizationByIdQuery['readOrganizationById']>;
