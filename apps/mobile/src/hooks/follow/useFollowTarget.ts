import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { FollowDocument, UnfollowDocument } from '@data/graphql/mutation';
import { GetFollowingDocument } from '@data/graphql/query';
import { FollowApprovalStatus, FollowTargetType } from '@data/graphql/types/graphql';
import { getApolloAuthContext } from '@/lib/auth';

export function useFollowTarget({
  authToken,
  targetId,
  targetType,
}: {
  authToken: string | null;
  targetId: string | null | undefined;
  targetType: FollowTargetType;
}) {
  const queryOptions = getApolloAuthContext(authToken);
  const {
    data,
    loading: queryLoading,
    refetch,
  } = useQuery(GetFollowingDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !authToken || !targetId,
    ...queryOptions,
  });
  const [followMutation, { loading: followLoading }] = useMutation(FollowDocument, queryOptions);
  const [unfollowMutation, { loading: unfollowLoading }] = useMutation(UnfollowDocument, queryOptions);

  const currentFollow = useMemo(
    () =>
      data?.readFollowing.find((follow) => follow.targetType === targetType && follow.targetId === targetId) ?? null,
    [data?.readFollowing, targetId, targetType],
  );
  const [approvalStatus, setApprovalStatus] = useState<FollowApprovalStatus | null>(
    currentFollow?.approvalStatus ?? null,
  );

  useEffect(() => {
    setApprovalStatus(currentFollow?.approvalStatus ?? null);
  }, [currentFollow?.approvalStatus]);

  const follow = async () => {
    if (!authToken || !targetId) {
      throw new Error('Authentication is required to follow this profile.');
    }

    const result = await followMutation({
      variables: {
        input: {
          targetId,
          targetType,
        },
      },
    });

    const nextStatus = result.data?.follow.approvalStatus ?? FollowApprovalStatus.Accepted;
    setApprovalStatus(nextStatus);
    return nextStatus;
  };

  const unfollow = async () => {
    if (!authToken || !targetId) {
      throw new Error('Authentication is required to update this follow.');
    }

    await unfollowMutation({
      variables: {
        targetId,
        targetType,
      },
    });

    setApprovalStatus(null);
    return null;
  };

  const loading = queryLoading || followLoading || unfollowLoading;

  return {
    approvalStatus,
    follow,
    isFollowing: approvalStatus === FollowApprovalStatus.Accepted,
    isPending: approvalStatus === FollowApprovalStatus.Pending,
    loading,
    refetch,
    unfollow,
  };
}
