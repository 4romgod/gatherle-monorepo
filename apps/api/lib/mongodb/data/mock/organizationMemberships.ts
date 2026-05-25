import { OrganizationRole } from '@gatherle/commons/types';

export type OrganizationMembershipSeed = {
  orgSlug: string;
  userEmail: string;
  role: OrganizationRole;
};

const organizationMemberships: OrganizationMembershipSeed[] = [
  { orgSlug: 'signal-studios', userEmail: 'user001@gmail.com', role: OrganizationRole.Owner },
  { orgSlug: 'signal-studios', userEmail: 'jay@rocknation.com', role: OrganizationRole.Host },
  { orgSlug: 'harbour-collective', userEmail: 'jay@rocknation.com', role: OrganizationRole.Owner },
  { orgSlug: 'harbour-collective', userEmail: 'celin@yahoo.com', role: OrganizationRole.Host },
  { orgSlug: 'emergent-labs', userEmail: 'Jeff@amazon.com', role: OrganizationRole.Owner },
  { orgSlug: 'emergent-labs', userEmail: 'user001@gmail.com', role: OrganizationRole.Moderator },
  { orgSlug: 'streetcar-society', userEmail: 'celin@yahoo.com', role: OrganizationRole.Owner },
  { orgSlug: 'streetcar-society', userEmail: 'Jeff@amazon.com', role: OrganizationRole.Host },
  { orgSlug: 'veld-wellness-collective', userEmail: 'jay@rocknation.com', role: OrganizationRole.Owner },
  { orgSlug: 'veld-wellness-collective', userEmail: 'user001@gmail.com', role: OrganizationRole.Member },
];

export default organizationMemberships;
