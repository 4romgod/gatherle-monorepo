import { graphql } from '@/data/graphql/types';

export const GetEventCategoryGroupsDocument = graphql(`
  query GetEventCategoryGroups {
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
