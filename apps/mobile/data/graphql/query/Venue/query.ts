import { graphql } from '../../types';

export const GetVenuesDocument = graphql(`
  query GetVenues($options: QueryOptionsInput) {
    readVenues(options: $options) {
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

export const GetVenueByIdDocument = graphql(`
  query GetVenueById($venueId: String!) {
    readVenueById(venueId: $venueId) {
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
