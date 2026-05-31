import { graphql } from '@/data/graphql/types';

export const CancelEventOccurrenceDocument = graphql(`
  mutation CancelEventOccurrence($input: CancelEventOccurrenceInput!) {
    cancelEventOccurrence(input: $input) {
      occurrenceId
      occurrenceKey
      eventSeriesId
      startAt
      endAt
      timezone
      originalStartAt
      status
      isException
      rsvpCount
    }
  }
`);

export const UpdateEventOccurrenceDocument = graphql(`
  mutation UpdateEventOccurrence($input: UpdateEventOccurrenceInput!) {
    updateEventOccurrence(input: $input) {
      occurrenceId
      occurrenceKey
      eventSeriesId
      startAt
      endAt
      timezone
      originalStartAt
      status
      isException
      rsvpCount
    }
  }
`);
