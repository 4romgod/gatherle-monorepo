import { graphql } from '@/data/graphql/types';

export const GetOrganizationMembershipsByOrgIdDocument = graphql(`
  query GetOrganizationMembershipsByOrgId($orgId: String!) {
    readOrganizationMembershipsByOrgId(orgId: $orgId) {
      membershipId
      orgId
      userId
      username
      role
      joinedAt
    }
  }
`);

export const GetOrganizationMembershipByIdDocument = graphql(`
  query GetOrganizationMembershipById($membershipId: String!) {
    readOrganizationMembershipById(membershipId: $membershipId) {
      membershipId
      orgId
      userId
      username
      role
      joinedAt
    }
  }
`);
