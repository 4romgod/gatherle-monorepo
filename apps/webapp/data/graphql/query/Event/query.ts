import { graphql } from '@/data/graphql/types';

export const GetEventsCountDocument = graphql(`
  query GetEventsCount {
    readEventsCount
  }
`);

export const GetTrendingEventsDocument = graphql(`
  query GetTrendingEvents($limit: Int) {
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
        anchorStartAt
        occurrenceDurationMinutes
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
      representativeOccurrence {
        occurrenceId
        occurrenceKey
        eventSeriesId
        originalStartAt
        startAt
        endAt
        timezone
        status
        isException
        rsvpCount
        participants {
          participantId
          occurrenceId
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
          occurrenceId
          status
          quantity
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
      myRsvp {
        participantId
        status
        quantity
      }
    }
  }
`);

export const GetEventsDocument = graphql(`
  query GetEvents($options: EventsQueryOptionsInput) {
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
        anchorStartAt
        occurrenceDurationMinutes
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
      representativeOccurrence {
        occurrenceId
        occurrenceKey
        eventSeriesId
        originalStartAt
        startAt
        endAt
        timezone
        status
        isException
        rsvpCount
        participants {
          participantId
          occurrenceId
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
          occurrenceId
          status
          quantity
        }
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
  query GetEventBySlug($slug: String!, $occurrencesFromDate: DateTimeISO) {
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
        anchorStartAt
        occurrenceDurationMinutes
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
      upcomingOccurrences(limit: 12, fromDate: $occurrencesFromDate) {
        occurrenceId
        originalStartAt
        startAt
        endAt
        timezone
        status
        rsvpCount
        participants {
          participantId
          occurrenceId
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
          occurrenceId
          status
          quantity
        }
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
        anchorStartAt
        occurrenceDurationMinutes
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
      representativeOccurrence {
        occurrenceId
        occurrenceKey
        eventSeriesId
        originalStartAt
        startAt
        endAt
        timezone
        status
        isException
        rsvpCount
        participants {
          participantId
          occurrenceId
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
          occurrenceId
          status
          quantity
        }
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
