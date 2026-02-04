import { graphql } from '@/data/graphql/types';

export const GetImageUploadUrlDocument = graphql(`
  query GetImageUploadUrl($folder: String!, $filename: String!) {
    getImageUploadUrl(folder: $folder, filename: $filename) {
      uploadUrl
      key
      publicUrl
      readUrl
    }
  }
`);
