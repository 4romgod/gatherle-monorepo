export const getReadEventParticipantsQuery = (eventId: string) => {
  return {
    query: `
      query GetEventParticipants($eventId: String!) {
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
