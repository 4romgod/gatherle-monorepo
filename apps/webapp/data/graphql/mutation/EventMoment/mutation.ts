import { graphql } from '@/data/graphql/types';

export const CreateEventMomentDocument = graphql(`
  mutation CreateEventMoment($input: CreateEventMomentInput!) {
    createEventMoment(input: $input) {
      momentId
      eventId
      authorId
      type
      state
      caption
      mediaUrl
      thumbnailUrl
      background
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

export const DeleteEventMomentDocument = graphql(`
  mutation DeleteEventMoment($momentId: String!) {
    deleteEventMoment(momentId: $momentId)
  }
`);
