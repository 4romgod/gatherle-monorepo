import { graphql } from '@/data/graphql/types';

export const GetAllVenuesDocument = graphql(`
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
`);
