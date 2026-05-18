import { graphql } from '../../types';

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
