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
