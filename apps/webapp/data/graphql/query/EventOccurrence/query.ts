import { graphql } from '@/data/graphql/types';

export const GetEventOccurrencesDocument = graphql(`
  query GetEventOccurrences($options: EventsQueryOptionsInput!) {
    readEventOccurrences(options: $options) {
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
      eventSeries {
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
        savedByCount
        isSavedByMe
      }
    }
  }
`);
