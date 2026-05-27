import { graphql } from '../../types';

export const CreateEventMomentDocument = graphql(`
  mutation CreateEventMoment($input: CreateEventMomentInput!) {
    createEventMoment(input: $input) {
      momentId
      eventId
      occurrenceId
      authorId
      type
      state
      caption
      mediaUrl
      thumbnailUrl
      imageDisplayMode
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

export const DeleteEventMomentDocument = graphql(`
  mutation DeleteEventMoment($momentId: String!) {
    deleteEventMoment(momentId: $momentId)
  }
`);
