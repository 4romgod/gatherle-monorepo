'use client';

import { useMutation, useQuery } from '@apollo/client';
import {
  GetNotificationsDocument,
  GetUnreadNotificationCountDocument,
  MarkNotificationReadDocument,
  MarkNotificationUnreadDocument,
  MarkAllNotificationsReadDocument,
  DeleteNotificationDocument,
} from '@/data/graphql/query';
import type { Notification, NotificationConnection } from '@/data/graphql/query/Notification/types';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import { useCallback, useRef, useState } from 'react';

interface UseNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Hook to fetch paginated notifications for the authenticated user
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 20, unreadOnly = false } = options;
  const { data: session } = useSession();
  const token = session?.user?.token;
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const { data, loading, error, refetch, fetchMore } = useQuery(GetNotificationsDocument, {
    variables: { limit, unreadOnly },
    skip: !token,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    context: {
      headers: getAuthHeader(token),
    },
  });

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !data?.notifications?.nextCursor || !data.notifications.hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      await fetchMore({
        variables: {
          cursor: data.notifications.nextCursor,
          limit,
          unreadOnly,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            notifications: {
              ...fetchMoreResult.notifications,
              notifications: [
                ...(prev.notifications?.notifications || []),
                ...(fetchMoreResult.notifications?.notifications || []),
              ],
            },
          };
        },
      });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [data?.notifications?.nextCursor, data?.notifications?.hasMore, fetchMore, limit, unreadOnly]);

  return {
    notifications: data?.notifications?.notifications ?? [],
    hasMore: data?.notifications?.hasMore ?? false,
    loadingMore,
    nextCursor: data?.notifications?.nextCursor,
    unreadCount: data?.notifications?.unreadCount ?? 0,
    loading,
    error,
    refetch,
    loadMore,
  };
}

/**
 * Hook to get just the unread notification count (for badge display).
 *
 * Unread counts are primarily kept up to date via WebSocket-driven events;
 * this GraphQL query provides the initial value and acts as a fallback when
 * the WebSocket connection is unavailable or out of date.
 */
export function useUnreadNotificationCount() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(GetUnreadNotificationCountDocument, {
    skip: !token,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    unreadCount: data?.unreadNotificationCount ?? 0,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to manage notification mutations (mark read, delete, etc.)
 */
export function useNotificationActions() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [markReadMutation, { loading: markReadLoading }] = useMutation(MarkNotificationReadDocument, {
    context: {
      headers: getAuthHeader(token),
    },
    refetchQueries: ['GetNotifications', 'GetUnreadNotificationCount'],
  });
  const [markUnreadMutation, { loading: markUnreadLoading }] = useMutation(MarkNotificationUnreadDocument, {
    context: {
      headers: getAuthHeader(token),
    },
    refetchQueries: ['GetNotifications', 'GetUnreadNotificationCount'],
  });

  const [markAllReadMutation, { loading: markAllReadLoading }] = useMutation(MarkAllNotificationsReadDocument, {
    context: {
      headers: getAuthHeader(token),
    },
    refetchQueries: ['GetNotifications', 'GetUnreadNotificationCount'],
  });

  const [deleteMutation, { loading: deleteLoading }] = useMutation(DeleteNotificationDocument, {
    context: {
      headers: getAuthHeader(token),
    },
    refetchQueries: ['GetNotifications', 'GetUnreadNotificationCount'],
  });

  const markAsRead = useCallback(
    async (notificationId: string) => {
      return markReadMutation({
        variables: { notificationId },
      });
    },
    [markReadMutation],
  );

  const markAllAsRead = useCallback(async () => {
    return markAllReadMutation();
  }, [markAllReadMutation]);

  const markAsUnread = useCallback(
    async (notificationId: string) => {
      return markUnreadMutation({
        variables: { notificationId },
      });
    },
    [markUnreadMutation],
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      return deleteMutation({
        variables: { notificationId },
      });
    },
    [deleteMutation],
  );

  return {
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    isLoading: markReadLoading || markUnreadLoading || markAllReadLoading || deleteLoading,
    markReadLoading,
    markUnreadLoading,
    markAllReadLoading,
    deleteLoading,
  };
}

export type { Notification, NotificationConnection };
