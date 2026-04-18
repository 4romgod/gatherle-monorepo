import { graphql } from '@/data/graphql/types';

export const GetEventsCountDocument = graphql(`
  query GetEventsCount {
    readEventsCount
  }
`);

export const ReadTrendingEventsDocument = graphql(`
  query ReadTrendingEvents($limit: Int) {
    readTrendingEvents(limit: $limit) {
      eventId
      slug
      title
      summary
      description
      status
      lifecycleStatus
      visibility
      primarySchedule {
        startAt
        endAt
        timezone
        recurrenceRule
      }
      eventCategories {
        eventCategoryId
        slug
        name
        iconName
        description
        color
      }
      location {
        locationType
        address {
          street
          city
          state
          zipCode
          country
        }
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
        }
      }
      organization {
        orgId
        slug
        name
        logo
      }
      rsvpCount
      savedByCount
      isSavedByMe
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
      myRsvp {
        participantId
        status
        quantity
      }
    }
  }
`);

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
      primarySchedule {
        startAt
        endAt
        timezone
        recurrenceRule
      }
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
      primarySchedule {
        startAt
        endAt
        timezone
        recurrenceRule
      }
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
      primarySchedule {
        startAt
        endAt
        timezone
        recurrenceRule
      }
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
