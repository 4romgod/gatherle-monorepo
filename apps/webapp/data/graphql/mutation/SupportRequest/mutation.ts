import { graphql } from '@/data/graphql/types';

export const CreateSupportRequestDocument = graphql(`
  mutation CreateSupportRequest($input: CreateSupportRequestInput!) {
    createSupportRequest(input: $input) {
      supportRequestId
      requesterUserId
      requesterEmail
      kind
      status
      subject
      message
      screenshotUrl
      pagePath
      platform
      userAgent
      appVersion
      buildVersion
      createdAt
      updatedAt
    }
  }
`);

export const UpdateSupportRequestStatusDocument = graphql(`
  mutation UpdateSupportRequestStatus($input: UpdateSupportRequestStatusInput!) {
    updateSupportRequestStatus(input: $input) {
      supportRequestId
      requesterUserId
      requesterEmail
      kind
      status
      subject
      message
      screenshotUrl
      pagePath
      platform
      userAgent
      appVersion
      buildVersion
      createdAt
      updatedAt
    }
  }
`);
