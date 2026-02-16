import { useMutation } from '@apollo/client';
import { RemoveFollowerDocument } from '@/data/graphql/query';
import type { FollowTargetType } from '@/data/graphql/types/graphql';
import { getFollowAuthContext, useFollowAuthToken } from './auth';

export function useRemoveFollower() {
  const token = useFollowAuthToken();

  const [removeFollowerMutation, { loading }] = useMutation(RemoveFollowerDocument, {
    refetchQueries: ['GetFollowers'],
    awaitRefetchQueries: true,
    ...getFollowAuthContext(token),
  });

  const removeFollower = async (followerUserId: string, targetType: FollowTargetType) => {
    return removeFollowerMutation({
      variables: {
        followerUserId,
        targetType,
      },
    });
  };

  return {
    removeFollower,
    loading,
  };
}
