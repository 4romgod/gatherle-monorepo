import { useMutation, useQuery } from '@apollo/client';
import { useCallback, useRef, useState } from 'react';
import { FollowTargetType } from '@data/graphql/types/graphql';
import {
  AcceptFollowRequestDocument,
  FollowDocument,
  RejectFollowRequestDocument,
} from '@data/graphql/mutation/Follow/mutation';
import {
  DeleteNotificationDocument,
  MarkAllNotificationsReadDocument,
  MarkNotificationReadDocument,
} from '@data/graphql/mutation/Notification/mutation';
import { GetPendingFollowRequestsDocument } from '@data/graphql/query/Follow/query';
import { GetNotificationsDocument } from '@data/graphql/query/Notification/query';
import { getApolloAuthContext } from '@/lib/auth';

export function useNotifications(authToken: string | null, enabled = true) {
  const queryOptions = getApolloAuthContext(authToken);
  const shouldLoadFollowRequests = enabled && Boolean(authToken);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const { data, error, loading, refetch, fetchMore } = useQuery(GetNotificationsDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !enabled || !authToken,
    variables: {
      limit: 24,
    },
    ...queryOptions,
  });

  const {
    data: followRequestsData,
    error: followRequestsError,
    loading: followRequestsLoading,
    refetch: refetchFollowRequests,
  } = useQuery(GetPendingFollowRequestsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !shouldLoadFollowRequests,
    variables: {
      targetType: FollowTargetType.User,
    },
    ...queryOptions,
  });

  const [markNotificationReadMutation] = useMutation(MarkNotificationReadDocument, queryOptions);
  const [markAllNotificationsReadMutation] = useMutation(MarkAllNotificationsReadDocument, queryOptions);
  const [deleteNotificationMutation] = useMutation(DeleteNotificationDocument, queryOptions);
  const [acceptFollowRequestMutation] = useMutation(AcceptFollowRequestDocument, queryOptions);
  const [rejectFollowRequestMutation] = useMutation(RejectFollowRequestDocument, queryOptions);
  const [followMutation] = useMutation(FollowDocument, queryOptions);

  const refreshAll = async () => {
    const refreshes: Array<Promise<unknown>> = [refetch()];
    if (shouldLoadFollowRequests) {
      refreshes.push(refetchFollowRequests());
    }

    await Promise.all(refreshes);
  };

  const loadMore = useCallback(async () => {
    if (!authToken || loadingMoreRef.current || !data?.notifications?.hasMore || !data.notifications.nextCursor) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      await fetchMore({
        variables: {
          cursor: data.notifications.nextCursor,
          limit: 24,
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          if (!fetchMoreResult?.notifications) {
            return previousResult;
          }

          return {
            notifications: {
              ...fetchMoreResult.notifications,
              notifications: [
                ...(previousResult.notifications?.notifications ?? []),
                ...(fetchMoreResult.notifications.notifications ?? []),
              ],
            },
          };
        },
      });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [authToken, data?.notifications, fetchMore]);

  const markNotificationRead = async (notificationId: string) => {
    if (!authToken) {
      return;
    }

    await markNotificationReadMutation({
      variables: {
        notificationId,
      },
    });

    await refetch();
  };

  const markAllNotificationsRead = async () => {
    if (!authToken) {
      return;
    }

    await markAllNotificationsReadMutation();
    await refetch();
  };

  const deleteNotification = async (notificationId: string) => {
    if (!authToken) {
      return;
    }

    await deleteNotificationMutation({
      variables: {
        notificationId,
      },
    });

    await refetch();
  };

  const acceptFollowRequest = async (followId: string) => {
    if (!authToken) {
      return;
    }

    await acceptFollowRequestMutation({
      variables: {
        followId,
      },
    });

    await refetchFollowRequests();
  };

  const rejectFollowRequest = async (followId: string) => {
    if (!authToken) {
      return;
    }

    await rejectFollowRequestMutation({
      variables: {
        followId,
      },
    });

    await refetchFollowRequests();
  };

  const followBackUser = async (targetId: string) => {
    if (!authToken) {
      return;
    }

    await followMutation({
      variables: {
        input: {
          targetId,
          targetType: FollowTargetType.User,
        },
      },
    });
  };

  return {
    acceptFollowRequest,
    deleteNotification,
    error: error ?? followRequestsError,
    followBackUser,
    followRequests: followRequestsData?.readPendingFollowRequests ?? [],
    loading: loading || followRequestsLoading,
    markAllNotificationsRead,
    markNotificationRead,
    notifications: data?.notifications?.notifications ?? [],
    hasMore: data?.notifications?.hasMore ?? false,
    loadMore,
    loadingMore,
    refetch: refreshAll,
    rejectFollowRequest,
    unreadCount: data?.notifications?.unreadCount ?? 0,
  };
}
