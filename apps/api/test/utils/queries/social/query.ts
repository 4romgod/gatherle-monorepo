export const getReadFollowingQuery = () => {
  return {
    query: `
      query ReadFollowing {
        readFollowing {
          followId
          followerUserId
          targetType
          targetId
          status
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
          status
        }
      }
    `,
    variables: {
      targetType,
      targetId,
    },
  };
};

export const getReadIntentsByUserQuery = () => {
  return {
    query: `
      query ReadIntentsByUser {
        readIntentsByUser {
          intentId
          userId
          eventId
          status
          visibility
          source
        }
      }
    `,
  };
};

export const getReadIntentsByEventQuery = (eventId: string) => {
  return {
    query: `
      query ReadIntentsByEvent($eventId: String!) {
        readIntentsByEvent(eventId: $eventId) {
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
      eventId,
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
