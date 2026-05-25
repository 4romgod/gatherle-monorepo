import { graphql } from '@/data/graphql/types';

export const GetMyEventOccurrenceRsvpStatusDocument = graphql(`
  query GetMyEventOccurrenceRsvpStatus($occurrenceId: String!) {
    myEventOccurrenceRsvpStatus(occurrenceId: $occurrenceId) {
      participantId
      occurrenceId
      userId
      status
      quantity
      sharedVisibility
      rsvpAt
      cancelledAt
    }
  }
`);

export const GetMyEventOccurrenceRsvpsDocument = graphql(`
  query GetMyEventOccurrenceRsvps($includeCancelled: Boolean = false, $options: QueryOptionsInput) {
    myEventOccurrenceRsvps(includeCancelled: $includeCancelled, options: $options) {
      participantId
      occurrenceId
      userId
      status
      quantity
      sharedVisibility
      rsvpAt
      cancelledAt
      occurrence {
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
  }
`);

export const GetUserEventOccurrencesDocument = graphql(`
  query GetUserEventOccurrences($userId: String!, $options: QueryOptionsInput) {
    readUserEventOccurrences(userId: $userId, options: $options) {
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

export const GetEventOccurrenceParticipantsDocument = graphql(`
  query GetEventOccurrenceParticipants($occurrenceId: String!) {
    readEventOccurrenceParticipants(occurrenceId: $occurrenceId) {
      participantId
      occurrenceId
      userId
      status
      quantity
      sharedVisibility
      rsvpAt
      cancelledAt
      user {
        userId
        username
        given_name
        family_name
        profile_picture
      }
    }
  }
`);
