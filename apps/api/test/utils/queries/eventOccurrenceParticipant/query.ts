export const getReadEventOccurrenceParticipantsQuery = (occurrenceId: string) => {
  return {
    query: `
      query GetEventOccurrenceParticipants($occurrenceId: String!) {
        readEventOccurrenceParticipants(occurrenceId: $occurrenceId) {
          participantId
          occurrenceId
          userId
          status
        }
      }
    `,
    variables: {
      occurrenceId,
    },
  };
};

export const getMyEventOccurrenceRsvpStatusQuery = (occurrenceId: string) => {
  return {
    query: `
      query GetMyEventOccurrenceRsvpStatus($occurrenceId: String!) {
        myEventOccurrenceRsvpStatus(occurrenceId: $occurrenceId) {
          participantId
          occurrenceId
          userId
          status
          quantity
        }
      }
    `,
    variables: {
      occurrenceId,
    },
  };
};
