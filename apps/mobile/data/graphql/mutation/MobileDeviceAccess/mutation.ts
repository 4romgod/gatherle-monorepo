import { graphql } from '../../types';

export const RegisterMobileDeviceAccessDocument = graphql(`
  mutation RegisterMobileDeviceAccess($input: RegisterMobileDeviceAccessInput!) {
    registerMobileDeviceAccess(input: $input) {
      deviceInstallationId
      platform
      status
      appVersion
      buildVersion
      registrationSecret
    }
  }
`);

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
