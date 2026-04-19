import { graphql } from '@/data/graphql/types';

export const ReadFollowedMomentsDocument = graphql(`
  query ReadFollowedMoments($cursor: String, $limit: Float) {
    readFollowedMoments(cursor: $cursor, limit: $limit) {
      items {
        momentId
        eventId
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
          slug
          title
        }
      }
      nextCursor
      hasMore
    }
  }
`);

export const ReadUserEventMomentsDocument = graphql(`
  query ReadUserEventMoments($userId: String!, $eventId: String!) {
    readUserEventMoments(userId: $userId, eventId: $eventId) {
      momentId
      eventId
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
    }
  }
`);

export const ReadEventMomentsDocument = graphql(`
  query ReadEventMoments($eventId: String!, $cursor: String, $limit: Float) {
    readEventMoments(eventId: $eventId, cursor: $cursor, limit: $limit) {
      items {
        momentId
        eventId
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
          slug
          title
        }
      }
      nextCursor
      hasMore
    }
  }
`);
