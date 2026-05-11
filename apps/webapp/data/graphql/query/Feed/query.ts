import { graphql } from '@/data/graphql/types';

export const GetRecommendedFeedDocument = graphql(`
  query GetRecommendedFeed($limit: Int, $skip: Int) {
    readRecommendedFeed(limit: $limit, skip: $skip) {
      feedItemId
      score
      reasons
      computedAt
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
          status
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
          media {
            featuredImageUrl
          }
          isSavedByMe
        }
      }
      event {
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
      }
    }
  }
`);
