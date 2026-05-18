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

export const UpdateEventDocument = graphql(`
  mutation UpdateEvent($input: UpdateEventInput!) {
    updateEvent(input: $input) {
      eventId
      slug
      title
      status
      lifecycleStatus
      visibility
      privacySetting
      capacity
      waitlistEnabled
      allowGuestPlusOnes
      eventLink
      summary
      description
    }
  }
`);

export const DeleteEventByIdDocument = graphql(`
  mutation DeleteEventById($eventId: String!) {
    deleteEventById(eventId: $eventId) {
      eventId
      title
    }
  }
`);
