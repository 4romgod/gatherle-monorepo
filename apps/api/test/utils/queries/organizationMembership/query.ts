export const getReadOrganizationMembershipByIdQuery = (membershipId: string) => ({
  query: `
    query GetOrganizationMembershipById($membershipId: String!) {
      readOrganizationMembershipById(membershipId: $membershipId) {
        membershipId
        orgId
        userId
        role
      }
    }
  `,
  variables: {
    membershipId,
  },
});

export const getReadOrganizationMembershipsByOrgIdQuery = (orgId: string) => ({
  query: `
    query GetOrganizationMembershipsByOrgId($orgId: String!) {
      readOrganizationMembershipsByOrgId(orgId: $orgId) {
        membershipId
        orgId
        userId
        role
      }
    }
  `,
  variables: {
    orgId,
  },
});
