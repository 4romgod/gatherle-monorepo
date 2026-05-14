export const getReadOrganizationByIdQuery = (orgId: string) => ({
  query: `
    query GetOrganizationById($orgId: String!) {
      readOrganizationById(orgId: $orgId) {
        orgId
        slug
        name
      }
    }
  `,
  variables: {
    orgId,
  },
});

export const getReadOrganizationBySlugQuery = (slug: string) => ({
  query: `
    query GetOrganizationBySlug($slug: String!) {
      readOrganizationBySlug(slug: $slug) {
        orgId
        slug
        name
      }
    }
  `,
  variables: {
    slug,
  },
});

export const getReadOrganizationsQuery = () => ({
  query: `
    query GetOrganizations {
      readOrganizations {
        orgId
        name
        slug
      }
    }
  `,
});

export const getReadOrganizationsWithOptionsQuery = (options: any) => ({
  query: `
    query GetOrganizations($options: QueryOptionsInput) {
      readOrganizations(options: $options) {
        orgId
        name
        slug
      }
    }
  `,
  variables: {
    options,
  },
});

export const getReadMyOrganizationsQuery = () => ({
  query: `
    query GetMyOrganizations {
      readMyOrganizations {
        role
        organization {
          orgId
          slug
          name
        }
      }
    }
  `,
});
