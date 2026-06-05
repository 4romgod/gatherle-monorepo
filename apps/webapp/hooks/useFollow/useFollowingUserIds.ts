import { useMemo } from 'react';
import { FollowApprovalStatus, FollowTargetType } from '@/data/graphql/types/graphql';
import { useFollowing } from './useFollowCore';

const EMPTY_FOLLOWING_USER_IDS = new Set<string>();

export function useFollowingUserIds() {
  const { following } = useFollowing();

  return useMemo(() => {
    const userIds = following
      .filter(
        (follow) =>
          follow.targetType === FollowTargetType.User &&
          follow.approvalStatus === FollowApprovalStatus.Accepted &&
          follow.targetId,
      )
      .map((follow) => follow.targetId as string);

    return userIds.length > 0 ? new Set(userIds) : EMPTY_FOLLOWING_USER_IDS;
  }, [following]);
}
