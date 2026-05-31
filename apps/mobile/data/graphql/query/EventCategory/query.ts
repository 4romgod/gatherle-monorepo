import { graphql } from '../../types';

export const GetEventCategoriesDocument = graphql(`
  query GetEventCategories {
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
