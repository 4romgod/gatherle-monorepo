export const getReadEventParticipantsQuery = (eventId: string) => {
  return {
    query: `
      query ReadEventParticipants($eventId: String!) {
        readEventParticipants(eventId: $eventId) {
          participantId
          eventId
          userId
          status
        }
      }
    `,
    variables: {
      eventId,
    },
  };
};
