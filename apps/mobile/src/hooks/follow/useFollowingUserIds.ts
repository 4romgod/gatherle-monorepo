import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetFollowingDocument } from '@data/graphql/query';
import { FollowApprovalStatus, FollowTargetType } from '@data/graphql/types/graphql';
import { getApolloAuthContext } from '@/lib/auth';

export function useFollowingUserIds(authToken: string | null) {
  const { data } = useQuery(GetFollowingDocument, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
    skip: !authToken,
    ...getApolloAuthContext(authToken),
  });

  return useMemo(
    () =>
      new Set(
        (data?.readFollowing ?? [])
          .filter(
            (follow) =>
              follow.targetType === FollowTargetType.User && follow.approvalStatus === FollowApprovalStatus.Accepted,
          )
          .map((follow) => follow.targetUser?.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    [data?.readFollowing],
  );
}
