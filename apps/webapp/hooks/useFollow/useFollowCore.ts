import { useMutation, useQuery } from '@apollo/client';
import { FollowDocument, GetFollowersDocument, GetFollowingDocument, UnfollowDocument } from '@/data/graphql/query';
import type { FollowTargetType } from '@/data/graphql/types/graphql';
import { getFollowAuthContext, useFollowAuthToken } from './auth';

export function useFollow() {
  const token = useFollowAuthToken();

  const [followMutation, { loading: followLoading }] = useMutation(FollowDocument, {
    refetchQueries: ['GetFollowing'],
    awaitRefetchQueries: true,
    ...getFollowAuthContext(token),
  });

  const [unfollowMutation, { loading: unfollowLoading }] = useMutation(UnfollowDocument, {
    refetchQueries: ['GetFollowing'],
    awaitRefetchQueries: true,
    ...getFollowAuthContext(token),
  });

  const follow = async (targetType: FollowTargetType, targetId: string) => {
    return followMutation({
      variables: {
        input: {
          targetType,
          targetId,
        },
      },
    });
  };

  const unfollow = async (targetType: FollowTargetType, targetId: string) => {
    return unfollowMutation({
      variables: {
        targetType,
        targetId,
      },
    });
  };

  return {
    follow,
    unfollow,
    followLoading,
    unfollowLoading,
    isLoading: followLoading || unfollowLoading,
  };
}

export function useFollowing() {
  const token = useFollowAuthToken();

  const { data, loading, error, refetch } = useQuery(GetFollowingDocument, {
    skip: !token,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    ...getFollowAuthContext(token),
  });

  return {
    following: data?.readFollowing ?? [],
    loading,
    error,
    refetch,
  };
}

export function useFollowers(targetType: FollowTargetType, targetId: string) {
  const token = useFollowAuthToken();

  const { data, loading, error, refetch } = useQuery(GetFollowersDocument, {
    variables: {
      targetType,
      targetId,
    },
    skip: !targetId,
    ...getFollowAuthContext(token),
  });

  return {
    followers: data?.readFollowers ?? [],
    loading,
    error,
    refetch,
  };
}
