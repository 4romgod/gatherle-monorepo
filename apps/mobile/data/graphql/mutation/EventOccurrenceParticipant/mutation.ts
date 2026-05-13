import { graphql } from '../../types';

export const UpsertEventOccurrenceParticipantDocument = graphql(`
  mutation UpsertEventOccurrenceParticipant($input: UpsertEventOccurrenceParticipantInput!) {
    upsertEventOccurrenceParticipant(input: $input) {
      participantId
      occurrenceId
      userId
      status
      quantity
      sharedVisibility
      rsvpAt
    }
  }
`);

export const CancelEventOccurrenceParticipantDocument = graphql(`
  mutation CancelEventOccurrenceParticipant($input: CancelEventOccurrenceParticipantInput!) {
    cancelEventOccurrenceParticipant(input: $input) {
      participantId
      occurrenceId
      userId
      status
      cancelledAt
    }
  }
`);
