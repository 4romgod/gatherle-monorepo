import { graphql } from '../../types';

export const GetMyEventOccurrenceRsvpStatusDocument = graphql(`
  query GetMyEventOccurrenceRsvpStatus($occurrenceId: String!) {
    myEventOccurrenceRsvpStatus(occurrenceId: $occurrenceId) {
      participantId
      occurrenceId
      userId
      status
      quantity
      sharedVisibility
      rsvpAt
      cancelledAt
    }
  }
`);
