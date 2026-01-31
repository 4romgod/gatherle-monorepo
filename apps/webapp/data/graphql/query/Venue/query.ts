import { graphql } from '@/data/graphql/types';

export const GetAllVenuesDocument = graphql(`
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

export const GetVenueBySlugDocument = graphql(`
  query GetVenueBySlug($slug: String!) {
    readVenueBySlug(slug: $slug) {
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
