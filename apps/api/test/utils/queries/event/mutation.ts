export const getCreateEventMutation = (event: any) => {
  return {
    query: `mutation CreateEvent($input: CreateEventInput!) {
            createEvent(input: $input) {
              eventId
              slug
              title
              description
              organizers {
                userId
                role
              }
              eventCategoryList {
                eventCategoryId
                slug
                name
              }
            }
        }`,
    variables: {
      input: event,
    },
  };
};

export const getDeleteEventBySlugMutation = (slug: string) => {
  return {
    query: `mutation DeleteEventBySlug($slug: String!) {
      deleteEventBySlug(slug: $slug) {
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

export const getUpdateEventMutation = (input: any) => {
  return {
    query: `mutation UpdateEvent($input: UpdateEventInput!) {
      updateEvent(input: $input) {
        eventId
        slug
        title
        description
      }
    }`,
    variables: {
      input,
    },
  };
};

export const getDeleteEventByIdMutation = (eventId: string) => {
  return {
    query: `mutation DeleteEventById($eventId: String!) {
      deleteEventById(eventId: $eventId) {
        eventId
        slug
        title
      }
    }`,
    variables: {
      eventId,
    },
  };
};
