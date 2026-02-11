'use client';

import { useMutation, useQuery } from '@apollo/client';
import {
  GetNotificationsDocument,
  GetUnreadNotificationCountDocument,
  MarkNotificationReadDocument,
  MarkAllNotificationsReadDocument,
  DeleteNotificationDocument,
} from '@/data/graphql/query';
import type { Notification, NotificationConnection } from '@/data/graphql/query/Notification/types';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';

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

  const { data, loading, error, refetch, fetchMore } = useQuery(GetNotificationsDocument, {
    variables: { limit, unreadOnly },
    skip: !token,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  const loadMore = useCallback(async () => {
    if (!data?.notifications?.nextCursor || !data.notifications.hasMore) {
      return;
    }

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
  }, [data?.notifications?.nextCursor, data?.notifications?.hasMore, fetchMore, limit, unreadOnly]);

  return {
    notifications: data?.notifications?.notifications ?? [],
    hasMore: data?.notifications?.hasMore ?? false,
    nextCursor: data?.notifications?.nextCursor,
    unreadCount: data?.notifications?.unreadCount ?? 0,
    loading,
    error,
    refetch,
    loadMore,
  };
}

/**
 * TODO: Look into Pub Sub
 * Hook to get just the unread notification count (for badge display)
 * Uses a separate lightweight query that can poll frequently
 * Only polls when the page is visible to avoid unnecessary requests
 */
export function useUnreadNotificationCount(pollInterval?: number) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const [isVisible, setIsVisible] = useState(() => typeof document !== 'undefined' && !document.hidden);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const { data, loading, error, refetch } = useQuery(GetUnreadNotificationCountDocument, {
    skip: !token || !isVisible, // Skip query when tab is hidden
    fetchPolicy: 'cache-and-network',
    pollInterval: pollInterval && isVisible ? pollInterval : 0, // Only poll when visible
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
    markAllAsRead,
    deleteNotification,
    isLoading: markReadLoading || markAllReadLoading || deleteLoading,
    markReadLoading,
    markAllReadLoading,
    deleteLoading,
  };
}

export type { Notification, NotificationConnection };
