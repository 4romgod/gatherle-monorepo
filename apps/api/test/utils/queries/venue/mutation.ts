export const getCreateVenueMutation = (input: any) => ({
  query: `
    mutation CreateVenue($input: CreateVenueInput!) {
      createVenue(input: $input) {
        venueId
        name
        orgId
        type
      }
    }
  `,
  variables: {
    input,
  },
});

export const getUpdateVenueMutation = (input: any) => ({
  query: `
    mutation UpdateVenue($input: UpdateVenueInput!) {
      updateVenue(input: $input) {
        venueId
        name
        capacity
      }
    }
  `,
  variables: {
    input,
  },
});

export const getDeleteVenueByIdMutation = (venueId: string) => ({
  query: `
    mutation DeleteVenueById($venueId: String!) {
      deleteVenueById(venueId: $venueId) {
        venueId
        name
      }
    }
  `,
  variables: {
    venueId,
  },
});
