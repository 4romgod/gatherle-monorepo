import { useMutation, useQuery } from '@apollo/client';
import { FollowTargetType } from '@data/graphql/types/graphql';
import { AcceptFollowRequestDocument, RejectFollowRequestDocument } from '@data/graphql/mutation/Follow/mutation';
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
  const { data, error, loading, refetch } = useQuery(GetNotificationsDocument, {
    fetchPolicy: 'cache-and-network',
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
    skip: !enabled || !authToken,
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

  const refreshAll = async () => {
    await Promise.all([refetch(), refetchFollowRequests()]);
  };

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

  return {
    acceptFollowRequest,
    deleteNotification,
    error: error ?? followRequestsError,
    followRequests: followRequestsData?.readPendingFollowRequests ?? [],
    loading: loading || followRequestsLoading,
    markAllNotificationsRead,
    markNotificationRead,
    notifications: data?.notifications?.notifications ?? [],
    refetch: refreshAll,
    rejectFollowRequest,
    unreadCount: data?.notifications?.unreadCount ?? 0,
  };
}
