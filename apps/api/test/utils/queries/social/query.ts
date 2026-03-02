export const getReadFollowingQuery = () => {
  return {
    query: `
      query ReadFollowing {
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
      query ReadFollowers($targetType: FollowTargetType!, $targetId: ID!) {
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
      query ReadActivitiesByActor($actorId: String!, $limit: Int) {
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
      query ReadFeed($limit: Int) {
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
