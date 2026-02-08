import { OrganizationMembership, OrganizationRole, User } from '@/data/graphql/types/graphql';

export interface OrganizationFormData {
  name: string;
  description: string;
  logo: string;
  billingEmail: string;
  tags: string;
}

export type MembershipAction =
  | { type: 'add' }
  | { type: 'update'; membershipId: string }
  | { type: 'remove'; membershipId: string };

export type PendingMembershipConfirmation =
  | { type: 'add'; user: User; role: OrganizationRole }
  | { type: 'role'; membership: OrganizationMembership; newRole: OrganizationRole }
  | { type: 'remove'; membership: OrganizationMembership };
