export const getUpsertEventOccurrenceParticipantMutation = (input: any) => {
  return {
    query: `
      mutation UpsertEventOccurrenceParticipant($input: UpsertEventOccurrenceParticipantInput!) {
        upsertEventOccurrenceParticipant(input: $input) {
          participantId
          occurrenceId
          userId
          status
          quantity
        }
      }
    `,
    variables: {
      input,
    },
  };
};

export const getCancelEventOccurrenceParticipantMutation = (input: any) => {
  return {
    query: `
      mutation CancelEventOccurrenceParticipant($input: CancelEventOccurrenceParticipantInput!) {
        cancelEventOccurrenceParticipant(input: $input) {
          participantId
          occurrenceId
          userId
          status
        }
      }
    `,
    variables: {
      input,
    },
  };
};
