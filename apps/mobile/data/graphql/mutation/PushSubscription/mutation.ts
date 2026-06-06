import { graphql } from '../../types';

export const RegisterPushSubscriptionDocument = graphql(`
  mutation RegisterPushSubscription($input: RegisterPushSubscriptionInput!) {
    registerPushSubscription(input: $input) {
      pushSubscriptionId
      userId
      provider
      platform
      token
      deviceInstallationId
      isActive
      lastRegisteredAt
      lastDeliveredAt
    }
  }
`);

export const UnregisterPushSubscriptionDocument = graphql(`
  mutation UnregisterPushSubscription($token: String!) {
    unregisterPushSubscription(token: $token)
  }
`);
