export const getReadTrendingEventsQuery = (limit?: number) => {
  return {
    query: `
      query GetTrendingEvents($limit: Int) {
        readTrendingEvents(limit: $limit) {
          eventId
          title
          lifecycleStatus
          status
          visibility
          rsvpCount
          savedByCount
        }
      }
    `,
    variables: { limit },
  };
};

export const getReadEventByIdQuery = (eventId: string) => {
  return {
    query: `query GetEventById($eventId: String!) {
            readEventById(eventId: $eventId) {
                eventId
                slug
                title
                description
            }
        }`,
    variables: {
      eventId: eventId,
    },
  };
};

export const getReadEventBySlugQuery = (slug: string) => {
  return {
    query: `query GetEventBySlug($slug: String!) {
            readEventBySlug(slug: $slug) {
                eventId
                slug
                title
                description
            }
        }`,
    variables: {
      slug: slug,
    },
  };
};
