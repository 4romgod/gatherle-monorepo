export const getCreateEventCategoryMutation = (createEventCategoryInput: any) => {
  return {
    query: `mutation CreateEventCategory($input: CreateEventCategoryInputType!) {
            createEventCategory(input: $input) {
                eventCategoryId
                name
                description
                slug
            }
        }`,
    variables: {
      input: createEventCategoryInput,
    },
  };
};

export const getUpdateEventCategoryMutation = (updateEventCategoryInput: any) => {
  return {
    query: `mutation UpdateEventCategory($input: UpdateEventCategoryInputType!) {
            updateEventCategory(input: $input) {
                eventCategoryId
                name
                description
                slug
                iconName
            }
        }`,
    variables: {
      input: updateEventCategoryInput,
    },
  };
};

export const getDeleteEventCategoryByIdMutation = (eventCategoryId: string) => {
  return {
    query: `mutation DeleteEventCategoryById($eventCategoryId: String!) {
            deleteEventCategoryById(eventCategoryId: $eventCategoryId) {
                eventCategoryId
                name
                description
                slug
            }
        }`,
    variables: {
      eventCategoryId: eventCategoryId,
    },
  };
};

export const getDeleteEventCategoryBySlugMutation = (slug: string) => {
  return {
    query: `mutation DeleteEventCategoryBySlug($slug: String!) {
            deleteEventCategoryBySlug(slug: $slug) {
                eventCategoryId
                name
                description
                slug
            }
        }`,
    variables: {
      slug: slug,
    },
  };
};
