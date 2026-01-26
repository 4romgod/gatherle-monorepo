import { graphql } from '@/data/graphql/types';

export const CreateEventCategoryGroupDocument = graphql(`
  mutation CreateEventCategoryGroup($input: CreateEventCategoryGroupInput!) {
    createEventCategoryGroup(input: $input) {
      eventCategoryGroupId
      name
      slug
      eventCategories {
        eventCategoryId
        name
        slug
      }
    }
  }
`);

export const UpdateEventCategoryGroupDocument = graphql(`
  mutation UpdateEventCategoryGroup($input: UpdateEventCategoryGroupInput!) {
    updateEventCategoryGroup(input: $input) {
      eventCategoryGroupId
      name
      slug
      eventCategories {
        eventCategoryId
        name
        slug
      }
    }
  }
`);

export const DeleteEventCategoryGroupBySlugDocument = graphql(`
  mutation DeleteEventCategoryGroupBySlug($slug: String!) {
    deleteEventCategoryGroupBySlug(slug: $slug) {
      eventCategoryGroupId
      name
      slug
    }
  }
`);
