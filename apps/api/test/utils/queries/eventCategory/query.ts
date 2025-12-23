import type {QueryOptionsInput} from '@ntlango/commons/types';

export const getReadEventCategoryByIdQuery = (eventCategoryId: string) => {
  return {
    query: `query ReadEventCategoryById($eventCategoryId: String!) {
            readEventCategoryById(eventCategoryId: $eventCategoryId) {
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

export const getReadEventCategoryBySlugQuery = (slug: string) => {
  return {
    query: `query ReadEventCategoryBySlug($slug: String!) {
            readEventCategoryBySlug(slug: $slug) {
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

export const getReadEventCategoriesQuery = () => {
  return {
    query: `query ReadEventCategories {
            readEventCategories {
                eventCategoryId
                name
                description
                slug
            }
        }`,
  };
};

export const getReadEventCategoriesWithOptionsQuery = (options: QueryOptionsInput) => {
  return {
    query: `query ReadEventCategories($options: QueryOptionsInput) {
            readEventCategories(options: $options) {
                eventCategoryId
                name
                description
                slug
            }
        }`,
    variables: {
      options,
    },
  };
};
