import { graphql } from '../../types';

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
  query GetMyEventOccurrenceRsvps($includeCancelled: Boolean = false) {
    myEventOccurrenceRsvps(includeCancelled: $includeCancelled) {
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
        myRsvp {
          participantId
          occurrenceId
          status
          quantity
        }
        eventSeries {
          eventId
          slug
          title
          summary
          description
          status
          visibility
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
  query GetUserEventOccurrences($userId: String!) {
    readUserEventOccurrences(userId: $userId) {
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
      eventSeries {
        eventId
        slug
        title
        summary
        description
        status
        visibility
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
