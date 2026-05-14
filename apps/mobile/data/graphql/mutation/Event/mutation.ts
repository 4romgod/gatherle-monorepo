import { graphql } from '../../types';

export const CreateEventDocument = graphql(`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      eventId
      slug
      title
      status
      lifecycleStatus
      visibility
    }
  }
`);
