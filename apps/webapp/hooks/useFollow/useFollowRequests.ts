import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import {
  AcceptFollowRequestDocument,
  GetFollowRequestsDocument,
  RejectFollowRequestDocument,
} from '@/data/graphql/query';
import { FollowApprovalStatus, type FollowTargetType } from '@/data/graphql/types/graphql';
import { getFollowAuthContext, useFollowAuthToken } from './auth';

/**
 * React hook to manage pending follow requests for a given follow target type.
 *
 * @param targetType - The type of entity whose pending follow requests should be fetched.
 *   This should be one of the values defined by the `FollowTargetType` GraphQL type
 *   (for example, a user or another followable resource type, depending on your schema).
 */
export function useFollowRequests(targetType: FollowTargetType) {
  const client = useApolloClient();
  const token = useFollowAuthToken();

  const {
    data,
    loading: queryLoading,
    error,
    refetch,
  } = useQuery(GetFollowRequestsDocument, {
    variables: { targetType },
    skip: !token,
    ...getFollowAuthContext(token),
  });

  const [acceptRequest, { loading: acceptLoading }] = useMutation(AcceptFollowRequestDocument, {
    refetchQueries: ['GetFollowers', 'GetNotifications', 'GetUnreadNotificationCount'],
    ...getFollowAuthContext(token),
  });

  const [rejectRequest, { loading: rejectLoading }] = useMutation(RejectFollowRequestDocument, {
    refetchQueries: ['GetNotifications', 'GetUnreadNotificationCount'],
    ...getFollowAuthContext(token),
  });

  const updateFollowRequestStatusInCache = (followId: string, approvalStatus: FollowApprovalStatus) => {
    client.cache.updateQuery(
      {
        query: GetFollowRequestsDocument,
        variables: { targetType },
      },
      (existing) => {
        if (!existing?.readFollowRequests) {
          return existing;
        }

        return {
          ...existing,
          readFollowRequests: existing.readFollowRequests.map((request) => {
            if (request.followId !== followId) {
              return request;
            }

            return {
              ...request,
              approvalStatus,
              updatedAt: new Date().toISOString(),
            };
          }),
        };
      },
    );
  };

  const accept = async (followId: string) => {
    const result = await acceptRequest({
      variables: { followId },
    });
    updateFollowRequestStatusInCache(followId, FollowApprovalStatus.Accepted);
    return result;
  };

  const reject = async (followId: string) => {
    const result = await rejectRequest({
      variables: { followId },
    });
    updateFollowRequestStatusInCache(followId, FollowApprovalStatus.Rejected);
    return result;
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
