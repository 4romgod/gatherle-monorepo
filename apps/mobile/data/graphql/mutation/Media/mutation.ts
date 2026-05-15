import { graphql } from '../../types';

export const GetEventMomentUploadUrlDocument = graphql(`
  mutation GetEventMomentUploadUrl($eventId: String!, $occurrenceId: String, $extension: String!) {
    getEventMomentUploadUrl(eventId: $eventId, occurrenceId: $occurrenceId, extension: $extension) {
      uploadUrl
      key
      readUrl
      momentId
    }
  }
`);
