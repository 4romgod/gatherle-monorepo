import { graphql } from '../../types';

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
