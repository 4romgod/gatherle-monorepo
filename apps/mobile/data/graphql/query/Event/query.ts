import { graphql } from '../../types';

export const GetEventsCountDocument = graphql(`
  query GetEventsCount($options: EventsQueryOptionsInput) {
    readEventsCount(options: $options)
  }
`);

export const GetEventsDocument = graphql(`
  query GetEvents($options: EventsQueryOptionsInput) {
    readEvents(options: $options) {
      eventId
      slug
      title
      summary
      description
      status
      visibility
      eventLink
      orgId
      venueId
      location {
        locationType
        details
        address {
          city
          state
          country
        }
      }
      organization {
        orgId
        slug
        name
        logo
      }
      media {
        featuredImageUrl
      }
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
        interestedUsersCount
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
      savedByCount
      isSavedByMe
      rsvpCount
      myRsvp {
        participantId
        status
        quantity
      }
      representativeOccurrence {
        occurrenceId
        occurrenceKey
        eventSeriesId
        startAt
        endAt
        timezone
        originalStartAt
        status
        isException
        rsvpCount
        participants {
          participantId
          occurrenceId
          userId
          status
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
export const GetEventByIdDocument = graphql(`
  query GetEventById($eventId: String!) {
    readEventById(eventId: $eventId) {
      eventId
      slug
      title
      summary
      description
      status
      lifecycleStatus
      visibility
      privacySetting
      capacity
      waitlistEnabled
      allowGuestPlusOnes
      eventLink
      orgId
      venueId
      location {
        locationType
        details
        address {
          city
          state
          country
          street
        }
      }
      media {
        featuredImageUrl
      }
      eventCategories {
        eventCategoryId
        name
      }
      primarySchedule {
        anchorStartAt
        occurrenceDurationMinutes
        timezone
        recurrenceRule
      }
    }
  }
`);

export const GetEventBySlugForNavigationDocument = graphql(`
  query GetEventBySlugForNavigation($slug: String!, $occurrencesFromDate: DateTimeISO) {
    readEventBySlug(slug: $slug) {
      eventId
      slug
      title
      summary
      description
      status
      visibility
      eventLink
      eventCategories {
        eventCategoryId
        slug
        name
        iconName
        description
        color
        interestedUsersCount
      }
      location {
        locationType
        details
        address {
          street
          city
          state
          country
        }
      }
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
      savedByCount
      isSavedByMe
      rsvpCount
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
      representativeOccurrence {
        occurrenceId
        occurrenceKey
        eventSeriesId
        startAt
        endAt
        timezone
        originalStartAt
        status
        isException
        rsvpCount
        participants {
          participantId
          occurrenceId
          userId
          status
          quantity
          sharedVisibility
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
      upcomingOccurrences(limit: 12, fromDate: $occurrencesFromDate) {
        occurrenceId
        occurrenceKey
        eventSeriesId
        startAt
        endAt
        timezone
        originalStartAt
        status
        isException
        rsvpCount
        participants {
          participantId
          occurrenceId
          userId
          status
          quantity
          sharedVisibility
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
