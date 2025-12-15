export const getCreateEventCategoryGroupMutation = (input: any) => {
  return {
    query: `
      mutation CreateEventCategoryGroup($input: CreateEventCategoryGroupInput!) {
        createEventCategoryGroup(input: $input) {
          eventCategoryGroupId
          slug
          name
          eventCategoryList {
            eventCategoryId
            name
          }
        }
      }
    `,
    variables: {
      input,
    },
  };
};

export const getUpdateEventCategoryGroupMutation = (input: any) => {
  return {
    query: `
      mutation UpdateEventCategoryGroup($input: UpdateEventCategoryGroupInput!) {
        updateEventCategoryGroup(input: $input) {
          eventCategoryGroupId
          slug
          name
          eventCategoryList {
            eventCategoryId
            name
          }
        }
      }
    `,
    variables: {
      input,
    },
  };
};

export const getDeleteEventCategoryGroupBySlugMutation = (slug: string) => {
  return {
    query: `
      mutation DeleteEventCategoryGroupBySlug($slug: String!) {
        deleteEventCategoryGroupBySlug(slug: $slug) {
          eventCategoryGroupId
          slug
          name
        }
      }
    `,
    variables: {
      slug,
    },
  };
};
