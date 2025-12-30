import { graphql } from '@/data/graphql/types';

export const GetAllEventsDocument = graphql(`
  query GetAllEvents($options: QueryOptionsInput) {
    readEvents(options: $options) {
      eventId
      slug
      title
      summary
      description
      visibility
      lifecycleStatus
      eventCategoryList {
        eventCategoryId
        slug
        name
        iconName
        description
        color
      }
      capacity
      status
      tags
      comments
      privacySetting
      eventLink
      location {
        locationType
        coordinates {
          latitude
          longitude
        }
        address {
          street
          city
          state
          zipCode
          country
        }
        details
      }
      recurrenceRule
      heroImage
      media {
        featuredImageUrl
      }
      mediaAssets {
        url
        alt
        type
        order
      }
      organizers {
        userId
        role
        user {
          userId
          username
          given_name
          family_name
          profile_picture
        }
      }
      participants {
        participantId
        eventId
        userId
        status
        sharedVisibility
        quantity
        user {
          userId
          username
          given_name
          family_name
          profile_picture
        }
      }
    }
  }
`);

export const GetEventBySlugDocument = graphql(`
  query GetEventBySlug($slug: String!) {
    readEventBySlug(slug: $slug) {
      eventId
      slug
      title
      summary
      description
      visibility
      lifecycleStatus
      eventCategoryList {
        eventCategoryId
        slug
        name
        iconName
        description
        color
      }
      capacity
      status
      tags
      comments
      privacySetting
      eventLink
      location {
        locationType
        coordinates {
          latitude
          longitude
        }
        address {
          street
          city
          state
          zipCode
          country
        }
        details
      }
      recurrenceRule
      heroImage
      media {
        featuredImageUrl
      }
      mediaAssets {
        url
        alt
        type
        order
      }
      organizers {
        userId
        role
        user {
          userId
          username
          given_name
          family_name
          profile_picture
        }
      }
      participants {
        participantId
        eventId
        userId
        status
        sharedVisibility
        quantity
        user {
          userId
          username
          given_name
          family_name
          profile_picture
        }
      }
    }
  }
`);
