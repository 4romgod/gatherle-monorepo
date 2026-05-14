import { graphql } from '../../types';

export const GetVenuesDocument = graphql(`
  query GetVenues {
    readVenues {
      slug
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
      featuredImageUrl
      images
    }
  }
`);
