import { graphql } from '../../types';

export const GetFollowedMomentsDocument = graphql(`
  query GetFollowedMoments($cursor: String, $limit: Float) {
    readFollowedMoments(cursor: $cursor, limit: $limit) {
      items {
        momentId
        eventId
        occurrenceId
        authorId
        type
        state
        caption
        mediaUrl
        thumbnailUrl
        background
        durationSeconds
        expiresAt
        createdAt
        author {
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
        }
      }
      nextCursor
      hasMore
    }
  }
`);

export const GetEventMomentsDocument = graphql(`
  query GetEventMoments($eventId: String!, $cursor: String, $limit: Float) {
    readEventMoments(eventId: $eventId, cursor: $cursor, limit: $limit) {
      items {
        momentId
        eventId
        occurrenceId
        authorId
        type
        state
        caption
        mediaUrl
        thumbnailUrl
        background
        durationSeconds
        expiresAt
        createdAt
        author {
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
        }
      }
      nextCursor
      hasMore
    }
  }
`);

export const GetUserEventMomentsDocument = graphql(`
  query GetUserEventMoments($userId: String!, $eventId: String!) {
    readUserEventMoments(userId: $userId, eventId: $eventId) {
      momentId
      eventId
      occurrenceId
      authorId
      type
      state
      caption
      mediaUrl
      thumbnailUrl
      background
      durationSeconds
      expiresAt
      createdAt
      author {
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
      }
    }
  }
`);

export const GetUserMomentsDocument = graphql(`
  query GetUserMoments($userId: String!, $cursor: String, $limit: Float) {
    readUserMoments(userId: $userId, cursor: $cursor, limit: $limit) {
      items {
        momentId
        eventId
        occurrenceId
        authorId
        type
        state
        caption
        mediaUrl
        thumbnailUrl
        background
        durationSeconds
        expiresAt
        createdAt
        author {
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
        }
      }
      nextCursor
      hasMore
    }
  }
`);
