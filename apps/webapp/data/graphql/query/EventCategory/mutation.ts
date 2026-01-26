import { graphql } from '@/data/graphql/types';

export const CreateEventCategoryDocument = graphql(`
  mutation CreateEventCategory($input: CreateEventCategoryInput!) {
    createEventCategory(input: $input) {
      eventCategoryId
      name
      slug
      description
      iconName
      color
    }
  }
`);

export const UpdateEventCategoryDocument = graphql(`
  mutation UpdateEventCategory($input: UpdateEventCategoryInput!) {
    updateEventCategory(input: $input) {
      eventCategoryId
      name
      slug
      description
      iconName
      color
    }
  }
`);

export const DeleteEventCategoryByIdDocument = graphql(`
  mutation DeleteEventCategoryById($eventCategoryId: String!) {
    deleteEventCategoryById(eventCategoryId: $eventCategoryId) {
      eventCategoryId
      name
    }
  }
`);
