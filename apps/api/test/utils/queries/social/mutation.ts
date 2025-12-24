export const getFollowMutation = (input: any) => {
  return {
    query: `
      mutation Follow($input: CreateFollowInput!) {
        follow(input: $input) {
          followId
          followerUserId
          targetType
          targetId
          status
        }
      }
    `,
    variables: {
      input,
    },
  };
};

export const getUnfollowMutation = (targetType: string, targetId: string) => {
  return {
    query: `
      mutation Unfollow($targetType: FollowTargetType!, $targetId: ID!) {
        unfollow(targetType: $targetType, targetId: $targetId)
      }
    `,
    variables: {
      targetType,
      targetId,
    },
  };
};

export const getUpsertIntentMutation = (input: any) => {
  return {
    query: `
      mutation UpsertIntent($input: UpsertIntentInput!) {
        upsertIntent(input: $input) {
          intentId
          userId
          eventId
          status
          visibility
          source
        }
      }
    `,
    variables: {
      input,
    },
  };
};

export const getLogActivityMutation = (input: any) => {
  return {
    query: `
      mutation LogActivity($input: CreateActivityInput!) {
        logActivity(input: $input) {
          activityId
          actorId
          verb
          objectType
          objectId
          visibility
        }
      }
    `,
    variables: {
      input,
    },
  };
};
