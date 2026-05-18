import { graphql } from '../../types';

export const CreateOrganizationMembershipDocument = graphql(`
  mutation CreateOrganizationMembership($input: CreateOrganizationMembershipInput!) {
    createOrganizationMembership(input: $input) {
      membershipId
      orgId
      userId
      username
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
      username
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
      username
      role
      joinedAt
    }
  }
`);
