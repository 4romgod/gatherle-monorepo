export const getCreateOrganizationMembershipMutation = (input: any) => ({
  query: `
    mutation CreateOrganizationMembership($input: CreateOrganizationMembershipInput!) {
      createOrganizationMembership(input: $input) {
        membershipId
        orgId
        userId
        role
      }
    }
  `,
  variables: {
    input,
  },
});

export const getUpdateOrganizationMembershipMutation = (input: any) => ({
  query: `
    mutation UpdateOrganizationMembership($input: UpdateOrganizationMembershipInput!) {
      updateOrganizationMembership(input: $input) {
        membershipId
        orgId
        userId
        role
      }
    }
  `,
  variables: {
    input,
  },
});

export const getDeleteOrganizationMembershipMutation = (input: any) => ({
  query: `
    mutation DeleteOrganizationMembership($input: DeleteOrganizationMembershipInput!) {
      deleteOrganizationMembership(input: $input) {
        membershipId
        orgId
        userId
      }
    }
  `,
  variables: {
    input,
  },
});
