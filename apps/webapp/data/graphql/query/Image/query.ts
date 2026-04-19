import { graphql } from '@/data/graphql/types';

export const GetImageUploadUrlDocument = graphql(`
  query GetImageUploadUrl(
    $entityType: ImageEntityType!
    $imageType: ImageType!
    $extension: String!
    $entityId: String
  ) {
    getImageUploadUrl(entityType: $entityType, imageType: $imageType, extension: $extension, entityId: $entityId) {
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
    }
  }
`);
