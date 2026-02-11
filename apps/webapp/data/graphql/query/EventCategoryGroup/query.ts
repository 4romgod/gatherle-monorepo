import { graphql } from '@/data/graphql/types';

export const GetAllEventCategoryGroupsDocument = graphql(`
  query GetAllEventCategoryGroups {
    readEventCategoryGroups {
      eventCategoryGroupId
      name
      slug
      eventCategories {
        eventCategoryId
        slug
        name
        iconName
        description
        color
        interestedUsersCount
      }
    }
  }
`);
