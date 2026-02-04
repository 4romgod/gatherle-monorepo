import { graphql } from '@/data/graphql/types';

export const CreateOrganizationMembershipDocument = graphql(`
  mutation CreateOrganizationMembership($input: CreateOrganizationMembershipInput!) {
    createOrganizationMembership(input: $input) {
      membershipId
      orgId
      userId
      role
      joinedAt
    }
  }
`);

export const UpdateOrganizationMembershipDocument = graphql(`
  mutation UpdateOrganizationMembership($input: UpdateOrganizationMembershipInput!) {
    updateOrganizationMembership(input: $input) {
      membershipId
      orgId
      userId
      role
      joinedAt
    }
  }
`);

export const DeleteOrganizationMembershipDocument = graphql(`
  mutation DeleteOrganizationMembership($input: DeleteOrganizationMembershipInput!) {
    deleteOrganizationMembership(input: $input) {
      membershipId
      orgId
      userId
      role
    }
  }
`);
