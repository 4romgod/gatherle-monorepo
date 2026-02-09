import { graphql } from '@/data/graphql/types';

export const GetAllEventsDocument = graphql(`
  query GetAllEvents($options: EventsQueryOptionsInput) {
    readEvents(options: $options) {
      venueId
      eventId
      slug
      title
      summary
      description
      visibility
      lifecycleStatus
      eventCategories {
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
      orgId
      organization {
        orgId
        slug
        name
        logo
      }
      media {
        featuredImageUrl
      }
      organizers {
        role
        user {
          userId
          username
          given_name
          family_name
          profile_picture
          defaultVisibility
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
          defaultVisibility
        }
      }
      savedByCount
      isSavedByMe
      rsvpCount
      myRsvp {
        participantId
        status
        quantity
      }
    }
  }
`);

export const GetEventBySlugDocument = graphql(`
  query GetEventBySlug($slug: String!) {
    readEventBySlug(slug: $slug) {
      venueId
      eventId
      slug
      title
      summary
      description
      visibility
      lifecycleStatus
      eventCategories {
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
      orgId
      organization {
        orgId
        slug
        name
        logo
      }
      media {
        featuredImageUrl
      }
      organizers {
        role
        user {
          userId
          username
          given_name
          family_name
          profile_picture
          defaultVisibility
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
          defaultVisibility
        }
      }
      savedByCount
      isSavedByMe
      rsvpCount
      myRsvp {
        participantId
        status
        quantity
      }
    }
  }
`);

export const GetEventsByVenueDocument = graphql(`
  query GetEventsByVenue($options: EventsQueryOptionsInput) {
    readEvents(options: $options) {
      venueId
      eventId
      slug
      title
      summary
      description
      visibility
      lifecycleStatus
      eventCategories {
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
      orgId
      organization {
        orgId
        slug
        name
        logo
      }
      media {
        featuredImageUrl
      }
      organizers {
        role
        user {
          userId
          username
          given_name
          family_name
          profile_picture
          defaultVisibility
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
          defaultVisibility
        }
      }
      savedByCount
      isSavedByMe
      rsvpCount
      myRsvp {
        participantId
        status
        quantity
      }
    }
  }
`);
