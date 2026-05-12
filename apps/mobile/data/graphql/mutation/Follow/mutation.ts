import { graphql } from '../../types';

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
