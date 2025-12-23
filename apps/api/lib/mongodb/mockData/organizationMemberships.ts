import {OrganizationRole} from '@ntlango/commons/types';

export type OrganizationMembershipSeed = {
  orgIndex: number;
  userIndex: number;
  role: OrganizationRole;
};

const organizationMemberships: OrganizationMembershipSeed[] = [
  {orgIndex: 0, userIndex: 0, role: OrganizationRole.Owner},
  {orgIndex: 0, userIndex: 1, role: OrganizationRole.Host},
  {orgIndex: 1, userIndex: 1, role: OrganizationRole.Owner},
  {orgIndex: 1, userIndex: 2, role: OrganizationRole.Host},
  {orgIndex: 2, userIndex: 3, role: OrganizationRole.Owner},
  {orgIndex: 2, userIndex: 0, role: OrganizationRole.Moderator},
  {orgIndex: 3, userIndex: 2, role: OrganizationRole.Owner},
  {orgIndex: 3, userIndex: 3, role: OrganizationRole.Host},
  {orgIndex: 4, userIndex: 1, role: OrganizationRole.Owner},
  {orgIndex: 4, userIndex: 0, role: OrganizationRole.Member},
];

export default organizationMemberships;
