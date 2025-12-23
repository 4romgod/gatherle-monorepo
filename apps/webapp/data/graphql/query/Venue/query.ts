import { gql } from '@apollo/client';

export const GET_VENUES = gql`
  query GetVenues {
    readVenues {
      venueId
      orgId
      name
      type
      capacity
      url
      amenities
      address {
        street
        city
        region
        country
        postalCode
      }
      geo {
        latitude
        longitude
      }
    }
  }
`;
