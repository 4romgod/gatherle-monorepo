import { graphql } from '@/data/graphql/types';

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
      }
      nextCursor
      hasMore
    }
  }
`);
