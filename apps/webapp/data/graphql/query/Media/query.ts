import { graphql } from '@/data/graphql/types';

export const GetMediaUploadUrlDocument = graphql(`
  query GetMediaUploadUrl(
    $entityType: MediaEntityType!
    $mediaType: MediaType!
    $extension: String!
    $entityId: String
  ) {
    getMediaUploadUrl(entityType: $entityType, mediaType: $mediaType, extension: $extension, entityId: $entityId) {
      uploadUrl
      key
      readUrl
    }
  }
`);

export const GetEventMomentUploadUrlDocument = graphql(`
  mutation GetEventMomentUploadUrl($eventId: String!, $extension: String!) {
    getEventMomentUploadUrl(eventId: $eventId, extension: $extension) {
      uploadUrl
      key
      readUrl
      momentId
    }
  }
`);
