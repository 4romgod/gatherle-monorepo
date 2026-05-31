import { graphql } from '@/data/graphql/types';

export const CreateVenueDocument = graphql(`
  mutation CreateVenue($input: CreateVenueInput!) {
    createVenue(input: $input) {
      venueId
      slug
      name
      type
      capacity
      url
      amenities
      address {
        street
        city
        region
        postalCode
        country
      }
    }
  }
`);

export const UpdateVenueDocument = graphql(`
  mutation UpdateVenue($input: UpdateVenueInput!) {
    updateVenue(input: $input) {
      venueId
      slug
      name
      type
      capacity
      url
      amenities
      featuredImageUrl
      images
      address {
        street
        city
        region
        postalCode
        country
      }
    }
  }
`);

export const DeleteVenueByIdDocument = graphql(`
  mutation DeleteVenueById($venueId: String!) {
    deleteVenueById(venueId: $venueId) {
      venueId
      slug
      name
      type
    }
  }
`);
