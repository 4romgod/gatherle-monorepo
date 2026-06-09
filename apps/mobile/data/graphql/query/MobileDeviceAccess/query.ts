import { graphql } from '../../types';

export const ReadMobileDeviceAccessesDocument = graphql(`
  query ReadMobileDeviceAccesses($input: ReadMobileDeviceAccessesInput) {
    readMobileDeviceAccesses(input: $input) {
      mobileDeviceAccessId
      deviceInstallationId
      platform
      status
      appVersion
      buildVersion
      firstSeenAt
      lastSeenAt
      seenUserIds
      lastSeenUserId
      lastAuthenticatedAt
      lastSeenUser {
        userId
        email
        username
        given_name
        family_name
      }
      seenUsers {
        userId
        email
        username
        given_name
        family_name
      }
      reviewedAt
      reviewedByUserId
      createdAt
      updatedAt
    }
  }
`);
