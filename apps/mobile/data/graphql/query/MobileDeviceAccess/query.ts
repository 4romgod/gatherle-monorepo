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
      applicationId
      deviceBrand
      deviceModel
      osVersion
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
      pushSummary {
        hasActiveSubscription
        activeSubscriptionCount
        providers
        lastRegisteredAt
        lastDeliveredAt
      }
      createdAt
      updatedAt
    }
  }
`);
