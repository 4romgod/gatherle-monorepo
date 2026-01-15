import { graphql } from '@/data/graphql/types';

export const FollowDocument = graphql(`
  mutation Follow($input: CreateFollowInput!) {
    follow(input: $input) {
      followId
      followerUserId
      targetType
      targetId
      approvalStatus
    }
  }
`);

export const UnfollowDocument = graphql(`
  mutation Unfollow($targetType: FollowTargetType!, $targetId: ID!) {
    unfollow(targetType: $targetType, targetId: $targetId)
  }
`);

export const AcceptFollowRequestDocument = graphql(`
  mutation AcceptFollowRequest($followId: ID!) {
    acceptFollowRequest(followId: $followId) {
      followId
      followerUserId
      targetType
      targetId
      approvalStatus
    }
  }
`);

export const RejectFollowRequestDocument = graphql(`
  mutation RejectFollowRequest($followId: ID!) {
    rejectFollowRequest(followId: $followId)
  }
`);

export const RemoveFollowerDocument = graphql(`
  mutation RemoveFollower($followerUserId: ID!, $targetType: FollowTargetType) {
    removeFollower(followerUserId: $followerUserId, targetType: $targetType)
  }
`);
