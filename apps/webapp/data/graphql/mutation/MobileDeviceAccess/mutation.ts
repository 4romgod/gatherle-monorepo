import { graphql } from '@/data/graphql/types';

export const UpdateMobileDeviceAccessStatusDocument = graphql(`
  mutation UpdateMobileDeviceAccessStatus($input: UpdateMobileDeviceAccessStatusInput!) {
    updateMobileDeviceAccessStatus(input: $input) {
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
