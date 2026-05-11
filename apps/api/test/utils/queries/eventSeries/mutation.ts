export const getCreateEventMutation = (event: any) => {
  return {
    query: `mutation CreateEvent($input: CreateEventInput!) {
            createEvent(input: $input) {
              eventId
              slug
              title
              description
              organizers {
                user {
                  userId
                  username
                }
                role
              }
              eventCategories {
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

export const getUpdateEventOccurrenceMutation = (input: any) => {
  return {
    query: `mutation UpdateEventOccurrence($input: UpdateEventOccurrenceInput!) {
      updateEventOccurrence(input: $input) {
        occurrenceId
        occurrenceKey
        eventSeriesId
        startAt
        endAt
        timezone
        status
        isException
      }
    }`,
    variables: {
      input,
    },
  };
};

export const getCancelEventOccurrenceMutation = (input: any) => {
  return {
    query: `mutation CancelEventOccurrence($input: CancelEventOccurrenceInput!) {
      cancelEventOccurrence(input: $input) {
        occurrenceId
        occurrenceKey
        eventSeriesId
        startAt
        endAt
        timezone
        status
        isException
      }
    }`,
    variables: {
      input,
    },
  };
};

export const getSplitEventSeriesAtOccurrenceMutation = (input: any) => {
  return {
    query: `mutation SplitEventSeriesAtOccurrence($input: SplitEventSeriesInput!) {
      splitEventSeriesAtOccurrence(input: $input) {
        eventId
        slug
        title
        splitFromEventSeriesId
        splitIntoEventSeriesId
        primarySchedule {
          anchorStartAt
          occurrenceDurationMinutes
          timezone
          recurrenceRule
        }
      }
    }`,
    variables: {
      input,
    },
  };
};
