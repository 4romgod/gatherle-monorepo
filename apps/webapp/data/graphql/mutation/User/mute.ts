import { graphql } from '@/data/graphql/types';

export const MuteUserDocument = graphql(`
  mutation MuteUser($mutedUserId: ID!) {
    muteUser(mutedUserId: $mutedUserId) {
      userId
      mutedUserIds
    }
  }
`);

export const UnmuteUserDocument = graphql(`
  mutation UnmuteUser($mutedUserId: ID!) {
    unmuteUser(mutedUserId: $mutedUserId) {
      userId
      mutedUserIds
    }
  }
`);

export const GetMutedUsersDocument = graphql(`
  query GetMutedUsers {
    readMutedUsers {
      userId
      username
      email
      given_name
      family_name
      profile_picture
      bio
    }
  }
`);

export const MuteOrganizationDocument = graphql(`
  mutation MuteOrganization($organizationId: ID!) {
    muteOrganization(organizationId: $organizationId) {
      userId
      mutedOrgIds
    }
  }
`);

export const UnmuteOrganizationDocument = graphql(`
  mutation UnmuteOrganization($organizationId: ID!) {
    unmuteOrganization(organizationId: $organizationId) {
      userId
      mutedOrgIds
    }
  }
`);

export const GetMutedOrganizationIdsDocument = graphql(`
  query GetMutedOrganizationIds {
    readMutedOrganizationIds
  }
`);
