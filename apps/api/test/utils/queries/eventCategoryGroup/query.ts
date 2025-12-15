import {QueryOptionsInput} from '@ntlango/commons/types';

export const getReadEventCategoryGroupBySlugQuery = (slug: string) => {
  return {
    query: `
      query ReadEventCategoryGroupBySlug($slug: String!) {
        readEventCategoryGroupBySlug(slug: $slug) {
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
      slug,
    },
  };
};

export const getReadEventCategoryGroupsQuery = () => {
  return {
    query: `
      query ReadEventCategoryGroups {
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
      query ReadEventCategoryGroups($options: QueryOptionsInput) {
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
