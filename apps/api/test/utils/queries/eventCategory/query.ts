import type { QueryOptionsInput } from '@gatherle/commons/types';

export const getReadEventCategoryByIdQuery = (eventCategoryId: string) => {
  return {
    query: `query GetEventCategoryById($eventCategoryId: String!) {
            readEventCategoryById(eventCategoryId: $eventCategoryId) {
                eventCategoryId
                name
                description
                slug
                interestedUsersCount
            }
        }`,
    variables: {
      eventCategoryId: eventCategoryId,
    },
  };
};

export const getReadEventCategoryBySlugQuery = (slug: string) => {
  return {
    query: `query GetEventCategoryBySlug($slug: String!) {
            readEventCategoryBySlug(slug: $slug) {
                eventCategoryId
                name
                description
                slug
                interestedUsersCount
            }
        }`,
    variables: {
      slug: slug,
    },
  };
};

export const getReadEventCategoriesQuery = () => {
  return {
    query: `query GetEventCategories {
            readEventCategories {
                eventCategoryId
                name
                description
                slug
                interestedUsersCount
            }
        }`,
  };
};

export const getReadEventCategoriesWithOptionsQuery = (options: QueryOptionsInput) => {
  return {
    query: `query GetEventCategories($options: QueryOptionsInput) {
            readEventCategories(options: $options) {
                eventCategoryId
                name
                description
                slug
                interestedUsersCount
            }
        }`,
    variables: {
      options,
    },
  };
};
