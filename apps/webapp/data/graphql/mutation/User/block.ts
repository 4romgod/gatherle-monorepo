import { graphql } from '@/data/graphql/types';

export const BlockUserDocument = graphql(`
  mutation BlockUser($blockedUserId: ID!) {
    blockUser(blockedUserId: $blockedUserId) {
      userId
      blockedUserIds
    }
  }
`);

export const UnblockUserDocument = graphql(`
  mutation UnblockUser($blockedUserId: ID!) {
    unblockUser(blockedUserId: $blockedUserId) {
      userId
      blockedUserIds
    }
  }
`);

export const GetBlockedUsersDocument = graphql(`
  query GetBlockedUsers {
    readBlockedUsers {
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
