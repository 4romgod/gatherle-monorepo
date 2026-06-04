import type { QueryOptionsInput } from '@gatherle/commons/server/types';

export const getReadEventCategoryGroupBySlugQuery = (slug: string) => {
  return {
    query: `
      query GetEventCategoryGroupBySlug($slug: String!) {
        readEventCategoryGroupBySlug(slug: $slug) {
          eventCategoryGroupId
          slug
          name
          eventCategories {
            eventCategoryId
            name
          }
        }
      }
    `,
    variables: {
      slug,
    },
  };
};

export const getReadEventCategoryGroupsQuery = () => {
  return {
    query: `
      query GetEventCategoryGroups {
        readEventCategoryGroups {
          eventCategoryGroupId
          slug
          name
        }
      }
    `,
  };
};

export const getReadEventCategoryGroupsWithOptionsQuery = (options: QueryOptionsInput) => {
  return {
    query: `
      query GetEventCategoryGroups($options: QueryOptionsInput) {
        readEventCategoryGroups(options: $options) {
          eventCategoryGroupId
          slug
          name
        }
      }
    `,
    variables: {
      options,
    },
  };
};
