import { graphql } from '@/data/graphql/types';

export const GetMyRsvpStatusDocument = graphql(`
  query GetMyRsvpStatus($eventId: String!) {
    myRsvpStatus(eventId: $eventId) {
      participantId
      eventId
      userId
      status
      quantity
      sharedVisibility
      rsvpAt
      cancelledAt
    }
  }
`);

export const GetMyRsvpsDocument = graphql(`
  query GetMyRsvps($includeCancelled: Boolean) {
    myRsvps(includeCancelled: $includeCancelled) {
      participantId
      eventId
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
      event {
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
  }
`);

export const GetEventParticipantsDocument = graphql(`
  query GetEventParticipants($eventId: String!) {
    readEventParticipants(eventId: $eventId) {
      participantId
      eventId
      userId
      status
      quantity
      sharedVisibility
      rsvpAt
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
