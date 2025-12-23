export const getReadVenueByIdQuery = (venueId: string) => ({
  query: `
    query ReadVenueById($venueId: String!) {
      readVenueById(venueId: $venueId) {
        venueId
        name
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
        orgId
      }
    }
  `,
  variables: {
    orgId,
  },
});
