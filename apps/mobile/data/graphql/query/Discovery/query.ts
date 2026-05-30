import { graphql } from '../../types';

export const GetHomeDiscoveryDocument = graphql(`
  query GetHomeDiscovery($upcomingOptions: EventsQueryOptionsInput!, $trendingOptions: EventsQueryOptionsInput!) {
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

export const GetEventsFeedDocument = graphql(`
  query GetEventsFeed($options: EventsQueryOptionsInput!) {
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
    readEventOccurrencesCount(options: $options)
    readEventCategories {
      eventCategoryId
      slug
      name
      iconName
      description
      color
      interestedUsersCount
    }
  }
`);

export const SearchEventsDocument = graphql(`
  query SearchEvents($options: EventsQueryOptionsInput) {
    readEvents(options: $options) {
      eventId
      slug
      title
      summary
      eventCategories {
        eventCategoryId
        name
      }
      location {
        locationType
        address {
          city
          state
          country
        }
      }
      media {
        featuredImageUrl
      }
    }
  }
`);
