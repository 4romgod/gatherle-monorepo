import { graphql } from '../../types';

export const GetPendingFollowRequestsDocument = graphql(`
  query GetPendingFollowRequests($targetType: FollowTargetType!) {
    readPendingFollowRequests(targetType: $targetType) {
      followId
      followerUserId
      follower {
        userId
        username
        email
        given_name
        family_name
        profile_picture
        bio
      }
      targetType
      targetId
      approvalStatus
      createdAt
      updatedAt
    }
  }
`);
