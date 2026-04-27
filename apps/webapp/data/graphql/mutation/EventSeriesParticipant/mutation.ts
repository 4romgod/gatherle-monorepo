import { graphql } from '@/data/graphql/types';

export const UpsertEventParticipantDocument = graphql(`
  mutation UpsertEventParticipant($input: UpsertEventParticipantInput!) {
    upsertEventParticipant(input: $input) {
      participantId
      eventId
      userId
      status
      quantity
      sharedVisibility
      rsvpAt
    }
  }
`);

export const CancelEventParticipantDocument = graphql(`
  mutation CancelEventParticipant($input: CancelEventParticipantInput!) {
    cancelEventParticipant(input: $input) {
      participantId
      eventId
      userId
      status
      cancelledAt
    }
  }
`);
