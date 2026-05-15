import { graphql } from '../../types';

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
