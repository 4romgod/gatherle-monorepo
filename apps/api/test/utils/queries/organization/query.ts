export const getReadOrganizationByIdQuery = (orgId: string) => ({
  query: `
    query ReadOrganizationById($orgId: String!) {
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
    query ReadOrganizationBySlug($slug: String!) {
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
    query ReadOrganizations {
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
    query ReadOrganizations($options: QueryOptionsInput) {
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
