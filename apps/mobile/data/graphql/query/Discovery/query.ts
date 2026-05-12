import { graphql } from '../../types';

export const MobileHomeDiscoveryDocument = graphql(`
  query MobileHomeDiscovery($upcomingOptions: EventsQueryOptionsInput!, $trendingOptions: EventsQueryOptionsInput!) {
    upcoming: readEventOccurrences(options: $upcomingOptions) {
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
    trending: readEventOccurrences(options: $trendingOptions) {
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
    readEventCategories {
      eventCategoryId
      slug
      name
      iconName
      description
      color
      interestedUsersCount
    }
    readOrganizations {
      orgId
      ownerId
      slug
      name
      description
      logo
      followersCount
      isFollowable
      tags
    }
  }
`);

export const MobileEventsFeedDocument = graphql(`
  query MobileEventsFeed($options: EventsQueryOptionsInput!) {
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
    readEventCategories {
      eventCategoryId
      slug
      name
      iconName
      description
      color
      interestedUsersCount
    }
    readEventsCount
  }
`);
