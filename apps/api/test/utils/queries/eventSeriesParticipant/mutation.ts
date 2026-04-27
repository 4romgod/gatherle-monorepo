export const getUpsertEventParticipantMutation = (input: any) => {
  return {
    query: `
      mutation UpsertEventParticipant($input: UpsertEventParticipantInput!) {
        upsertEventParticipant(input: $input) {
          participantId
          eventId
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

export const getCancelEventParticipantMutation = (input: any) => {
  return {
    query: `
      mutation CancelEventParticipant($input: CancelEventParticipantInput!) {
        cancelEventParticipant(input: $input) {
          participantId
          eventId
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
