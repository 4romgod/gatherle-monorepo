export const getReadFollowingQuery = () => {
  return {
    query: `
      query GetFollowing {
        readFollowing {
          followId
          followerUserId
          targetType
          targetId
          approvalStatus
        }
      }
    `,
  };
};

export const getReadFollowersQuery = (targetType: string, targetId: string) => {
  return {
    query: `
      query GetFollowers($targetType: FollowTargetType!, $targetId: ID!) {
        readFollowers(targetType: $targetType, targetId: $targetId) {
          followId
          followerUserId
          targetType
          targetId
          approvalStatus
        }
      }
    `,
    variables: {
      targetType,
      targetId,
    },
  };
};

export const getReadActivitiesByActorQuery = (actorId: string, limit?: number) => {
  return {
    query: `
      query GetActivitiesByActor($actorId: String!, $limit: Int) {
        readActivitiesByActor(actorId: $actorId, limit: $limit) {
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
      actorId,
      limit,
    },
  };
};

export const getReadFeedQuery = (limit?: number) => {
  return {
    query: `
      query GetFeed($limit: Int) {
        readFeed(limit: $limit) {
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
      limit,
    },
  };
};
