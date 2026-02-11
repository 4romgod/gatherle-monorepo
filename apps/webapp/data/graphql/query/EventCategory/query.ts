import { graphql } from '@/data/graphql/types';

export const GetAllEventCategoriesDocument = graphql(`
  query GetAllEventCategories {
    readEventCategories {
      eventCategoryId
      slug
      name
      iconName
      description
      color
      interestedUsersCount
    }
  }
`);

export const GetEventCategoryBySlugDocument = graphql(`
  query GetEventCategoryBySlug($slug: String!) {
    readEventCategoryBySlug(slug: $slug) {
      eventCategoryId
      slug
      name
      iconName
      description
      color
      interestedUsersCount
    }
  }
`);
