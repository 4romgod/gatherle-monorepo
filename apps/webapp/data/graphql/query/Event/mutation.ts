import { graphql } from '@/data/graphql/types';

export const DeleteEventByIdDocument = graphql(`
  mutation DeleteEventById($eventId: String!) {
    deleteEventById(eventId: $eventId) {
      eventId
      slug
      title
      description
      recurrenceRule
      location {
        locationType
        coordinates {
          latitude
          longitude
        }
        address {
          street
          city
          state
          zipCode
          country
        }
        details
      }
      organizers {
        role
        user {
          userId
          username
          given_name
          family_name
          profile_picture
        }
      }
    }
  }
`);

export const UpdateEventDocument = graphql(`
  mutation UpdateEvent($input: UpdateEventInput!) {
    updateEvent(input: $input) {
      eventId
      title
      status
      lifecycleStatus
      visibility
    }
  }
`);
