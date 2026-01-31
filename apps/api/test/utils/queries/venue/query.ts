export const getReadVenueByIdQuery = (venueId: string) => ({
  query: `
    query ReadVenueById($venueId: String!) {
      readVenueById(venueId: $venueId) {
        venueId
        name
        slug
        capacity
        orgId
      }
    }
  `,
  variables: {
    venueId,
  },
});

export const getReadVenuesQuery = () => ({
  query: `
    query ReadVenues {
      readVenues {
        venueId
        name
        slug
        orgId
      }
    }
  `,
});

export const getReadVenuesByOrgIdQuery = (orgId: string) => ({
  query: `
    query ReadVenuesByOrgId($orgId: String!) {
      readVenuesByOrgId(orgId: $orgId) {
        venueId
        name
        slug
        orgId
      }
    }
  `,
  variables: {
    orgId,
  },
});

export const getReadVenueBySlugQuery = (slug: string) => ({
  query: `
    query ReadVenueBySlug($slug: String!) {
      readVenueBySlug(slug: $slug) {
        venueId
        name
        slug
        orgId
      }
    }
  `,
  variables: {
    slug,
  },
});
