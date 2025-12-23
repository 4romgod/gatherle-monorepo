export const getCreateOrganizationMutation = (input: any) => ({
  query: `
    mutation CreateOrganization($input: CreateOrganizationInput!) {
      createOrganization(input: $input) {
        orgId
        slug
        name
        ownerId
        allowedTicketAccess
      }
    }
  `,
  variables: {
    input,
  },
});

export const getUpdateOrganizationMutation = (input: any) => ({
  query: `
    mutation UpdateOrganization($input: UpdateOrganizationInput!) {
      updateOrganization(input: $input) {
        orgId
        name
        description
        allowedTicketAccess
      }
    }
  `,
  variables: {
    input,
  },
});

export const getDeleteOrganizationByIdMutation = (orgId: string) => ({
  query: `
    mutation DeleteOrganizationById($orgId: String!) {
      deleteOrganizationById(orgId: $orgId) {
        orgId
        name
      }
    }
  `,
  variables: {
    orgId,
  },
});
