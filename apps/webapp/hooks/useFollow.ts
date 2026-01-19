'use client';

import { useMutation, useQuery } from '@apollo/client';
import {
  FollowDocument,
  UnfollowDocument,
  GetFollowingDocument,
  GetFollowersDocument,
  GetFollowRequestsDocument,
  AcceptFollowRequestDocument,
  RejectFollowRequestDocument,
  RemoveFollowerDocument,
  MuteUserDocument,
  UnmuteUserDocument,
  GetMutedUsersDocument,
  MuteOrganizationDocument,
  UnmuteOrganizationDocument,
  GetMutedOrganizationIdsDocument,
} from '@/data/graphql/query';
import type { FollowTargetType } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';

export function useFollow() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [followMutation, { loading: followLoading }] = useMutation(FollowDocument, {
    refetchQueries: ['GetFollowing', 'GetFollowRequests'],
    awaitRefetchQueries: true,
    context: {
      headers: getAuthHeader(token),
    },
  });

  const [unfollowMutation, { loading: unfollowLoading }] = useMutation(UnfollowDocument, {
    refetchQueries: ['GetFollowing', 'GetFollowRequests'],
    awaitRefetchQueries: true,
    context: {
      headers: getAuthHeader(token),
    },
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
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(GetFollowingDocument, {
    skip: !token,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    following: data?.readFollowing ?? [],
    loading,
    error,
    refetch,
  };
}

export function useFollowers(targetType: FollowTargetType, targetId: string) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(GetFollowersDocument, {
    variables: {
      targetType,
      targetId,
    },
    skip: !targetId,
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    followers: data?.readFollowers ?? [],
    loading,
    error,
    refetch,
  };
}

/**
 * React hook to manage pending follow requests for a given follow target type.
 *
 * @param targetType - The type of entity whose pending follow requests should be fetched.
 *   This should be one of the values defined by the `FollowTargetType` GraphQL type
 *   (for example, a user or another followable resource type, depending on your schema).
 */
export function useFollowRequests(targetType: FollowTargetType) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const {
    data,
    loading: queryLoading,
    error,
    refetch,
  } = useQuery(GetFollowRequestsDocument, {
    variables: { targetType },
    skip: !token,
    context: {
      headers: getAuthHeader(token),
    },
  });

  const [acceptRequest, { loading: acceptLoading }] = useMutation(AcceptFollowRequestDocument, {
    refetchQueries: ['GetFollowRequests', 'GetFollowers'],
    context: {
      headers: getAuthHeader(token),
    },
  });

  const [rejectRequest, { loading: rejectLoading }] = useMutation(RejectFollowRequestDocument, {
    refetchQueries: ['GetFollowRequests'],
    context: {
      headers: getAuthHeader(token),
    },
  });

  const accept = async (followId: string) => {
    return acceptRequest({
      variables: { followId },
    });
  };

  const reject = async (followId: string) => {
    return rejectRequest({
      variables: { followId },
    });
  };

  return {
    requests: data?.readFollowRequests ?? [],
    loading: queryLoading,
    error,
    refetch,
    accept,
    reject,
    acceptLoading,
    rejectLoading,
    isLoading: queryLoading || acceptLoading || rejectLoading,
  };
}

/**
 * Hook to mute/unmute users.
 * Muted users' content will be hidden from your feed.
 */
export function useMuteUser() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [muteMutation, { loading: muteLoading }] = useMutation(MuteUserDocument, {
    refetchQueries: ['GetMutedUsers'],
    context: {
      headers: getAuthHeader(token),
    },
  });

  const [unmuteMutation, { loading: unmuteLoading }] = useMutation(UnmuteUserDocument, {
    refetchQueries: ['GetMutedUsers'],
    context: {
      headers: getAuthHeader(token),
    },
  });

  const muteUser = async (userId: string) => {
    return muteMutation({
      variables: { mutedUserId: userId },
    });
  };

  const unmuteUser = async (userId: string) => {
    return unmuteMutation({
      variables: { mutedUserId: userId },
    });
  };

  return {
    muteUser,
    unmuteUser,
    loading: muteLoading || unmuteLoading,
  };
}

/**
 * Hook to get the list of muted users.
 */
export function useMutedUsers() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(GetMutedUsersDocument, {
    skip: !token,
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    mutedUsers: data?.readMutedUsers ?? [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to mute/unmute organizations.
 * Muted organizations' content will be hidden from your feed.
 */
export function useMuteOrganization() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [muteMutation, { loading: muteLoading }] = useMutation(MuteOrganizationDocument, {
    refetchQueries: ['GetMutedOrganizationIds'],
    context: {
      headers: getAuthHeader(token),
    },
  });

  const [unmuteMutation, { loading: unmuteLoading }] = useMutation(UnmuteOrganizationDocument, {
    refetchQueries: ['GetMutedOrganizationIds'],
    context: {
      headers: getAuthHeader(token),
    },
  });

  const muteOrganization = async (organizationId: string) => {
    return muteMutation({
      variables: { organizationId },
    });
  };

  const unmuteOrganization = async (organizationId: string) => {
    return unmuteMutation({
      variables: { organizationId },
    });
  };

  return {
    muteOrganization,
    unmuteOrganization,
    loading: muteLoading || unmuteLoading,
  };
}

/**
 * Hook to get the list of muted organization IDs.
 */
export function useMutedOrganizations() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(GetMutedOrganizationIdsDocument, {
    skip: !token,
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    mutedOrgIds: data?.readMutedOrganizationIds ?? [],
    loading,
    error,
    refetch,
  };
}

export function useRemoveFollower() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [removeFollowerMutation, { loading }] = useMutation(RemoveFollowerDocument, {
    refetchQueries: ['GetFollowers'],
    awaitRefetchQueries: true,
    context: {
      headers: getAuthHeader(token),
    },
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
