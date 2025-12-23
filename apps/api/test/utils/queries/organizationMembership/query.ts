export const getReadOrganizationMembershipByIdQuery = (membershipId: string) => ({
  query: `
    query ReadOrganizationMembershipById($membershipId: String!) {
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
    query ReadOrganizationMembershipsByOrgId($orgId: String!) {
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
