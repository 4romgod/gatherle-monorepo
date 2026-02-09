import { graphql } from '@/data/graphql/types';

export const GetFollowingDocument = graphql(`
  query GetFollowing {
    readFollowing {
      followId
      followerUserId
      targetType
      targetId
      targetUser {
        userId
        username
        email
        given_name
        family_name
        profile_picture
        bio
      }
      targetOrganization {
        orgId
        slug
        name
        logo
      }
      approvalStatus
      createdAt
    }
  }
`);

export const GetFollowersDocument = graphql(`
  query GetFollowers($targetType: FollowTargetType!, $targetId: ID!) {
    readFollowers(targetType: $targetType, targetId: $targetId) {
      followId
      followerUserId
      follower {
        userId
        username
        email
        given_name
        family_name
        profile_picture
        bio
      }
      targetType
      targetId
      approvalStatus
      createdAt
    }
  }
`);

export const GetPendingFollowRequestsDocument = graphql(`
  query GetPendingFollowRequests($targetType: FollowTargetType!) {
    readPendingFollowRequests(targetType: $targetType) {
      followId
      followerUserId
      follower {
        userId
        username
        email
        given_name
        family_name
        profile_picture
        bio
      }
      targetType
      targetId
      approvalStatus
      createdAt
      updatedAt
    }
  }
`);

export const GetFollowRequestsDocument = graphql(`
  query GetFollowRequests($targetType: FollowTargetType!) {
    readFollowRequests(targetType: $targetType) {
      followId
      followerUserId
      follower {
        userId
        username
        email
        given_name
        family_name
        profile_picture
        bio
      }
      targetType
      targetId
      approvalStatus
      createdAt
      updatedAt
    }
  }
`);

export const GetSavedEventsDocument = graphql(`
  query GetSavedEvents {
    readSavedEvents {
      followId
      followerUserId
      targetType
      targetId
      targetEvent {
        eventId
        slug
        title
        summary
        description
        recurrenceRule
        primarySchedule {
          startAt
          endAt
          timezone
        }
        location {
          locationType
          address {
            street
            city
            state
            country
          }
          details
        }
        media {
          featuredImageUrl
        }
        status
        eventCategories {
          eventCategoryId
          slug
          name
          iconName
          color
        }
        savedByCount
        isSavedByMe
        rsvpCount
      }
      createdAt
    }
  }
`);

export const IsEventSavedDocument = graphql(`
  query IsEventSaved($eventId: ID!) {
    isEventSaved(eventId: $eventId)
  }
`);
