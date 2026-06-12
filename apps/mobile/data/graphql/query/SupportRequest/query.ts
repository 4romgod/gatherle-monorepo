import { graphql } from '../../types';

export const ReadSupportRequestsDocument = graphql(`
  query ReadSupportRequests($input: ReadSupportRequestsInput) {
    readSupportRequests(input: $input) {
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
