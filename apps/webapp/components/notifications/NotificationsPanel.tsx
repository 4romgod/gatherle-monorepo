'use client';

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  List,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { DoneAll as MarkAllReadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { FollowApprovalStatus, FollowTargetType, type GetFollowRequestsQuery } from '@/data/graphql/types/graphql';
import NotificationItem from './NotificationItem';
import PendingFollowRequestItem from './follow/PendingFollowRequestItem';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useFollowRequests, useNotificationActions, useNotifications } from '@/hooks';
import type { Notification } from '@/hooks/useNotifications';
import { logger } from '@/lib/utils';

type FollowRequest = GetFollowRequestsQuery['readFollowRequests'][number];
type NotificationFeedItem =
  | { createdAt: string; id: string; kind: 'notification'; notification: Notification }
  | { createdAt: string; id: string; kind: 'follow-request'; request: FollowRequest };

function formatDateGroupLabel(createdAt?: string | null) {
  if (!createdAt) {
    return 'Earlier';
  }

  const target = new Date(createdAt);
  if (Number.isNaN(target.getTime())) {
    return 'Earlier';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const dayDiff = Math.round((startOfTarget - startOfToday) / 86400000);

  if (dayDiff === 0) {
    return 'Today';
  }

  if (dayDiff === -1) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(target);
}

function NotificationsSkeleton() {
  return (
    <Stack spacing={2}>
      {[1, 2].map((group) => (
        <Box key={group}>
          <Skeleton variant="text" width={92} height={18} sx={{ mb: 1 }} />
          {[1, 2].map((row, index) => (
            <React.Fragment key={`${group}-${row}`}>
              <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.75 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="58%" height={20} />
                  <Skeleton variant="text" width="88%" height={16} />
                  <Skeleton variant="text" width="32%" height={14} />
                </Box>
              </Box>
              <Divider />
            </React.Fragment>
          ))}
        </Box>
      ))}
    </Stack>
  );
}

export default function NotificationsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { notifications, loading, error, hasMore, loadMore, loadingMore, refetch, unreadCount } = useNotifications({
    limit: 20,
  });
  const {
    requests,
    loading: followRequestsLoading,
    error: followRequestsError,
    refetch: refetchFollowRequests,
    accept,
    reject,
    isLoading: followActionsLoading,
  } = useFollowRequests(FollowTargetType.User);
  const {
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    isLoading: notificationActionsLoading,
  } = useNotificationActions();

  const pendingFollowRequests = useMemo(
    () => requests.filter((request) => request.approvalStatus === FollowApprovalStatus.Pending),
    [requests],
  );

  const feedItems = useMemo<NotificationFeedItem[]>(
    () =>
      [
        ...notifications.map((notification) => ({
          createdAt: notification.createdAt,
          id: notification.notificationId,
          kind: 'notification' as const,
          notification,
        })),
        ...pendingFollowRequests.map((request) => ({
          createdAt: request.createdAt,
          id: request.followId,
          kind: 'follow-request' as const,
          request,
        })),
      ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [notifications, pendingFollowRequests],
  );

  const groupedFeed = useMemo(() => {
    const groups = new Map<string, NotificationFeedItem[]>();

    for (const item of feedItems) {
      const label = formatDateGroupLabel(item.createdAt);
      const current = groups.get(label) ?? [];
      current.push(item);
      groups.set(label, current);
    }

    return Array.from(groups.entries()).map(([label, items]) => ({ items, label }));
  }, [feedItems]);

  const isLoadingFeed = (loading || followRequestsLoading) && feedItems.length === 0;
  const isMutating = notificationActionsLoading || followActionsLoading;
  const blockingError = feedItems.length === 0 ? error || followRequestsError : null;
  const loadMoreTriggerRef = useInfiniteScroll({
    enabled: hasMore,
    loading: loading || loadingMore || isRefreshing,
    onEndReached: loadMore,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchFollowRequests()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (actionError) {
      logger.error('Failed to mark notification as read:', actionError);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (actionError) {
      logger.error('Failed to mark all notifications as read:', actionError);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (actionError) {
      logger.error('Failed to delete notification:', actionError);
    }
  };

  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      await markAsUnread(notificationId);
    } catch (actionError) {
      logger.error('Failed to mark notification as unread:', actionError);
    }
  };

  const handleAcceptFollowRequest = async (followId: string) => {
    try {
      await accept(followId);
    } catch (actionError) {
      logger.error('Failed to accept follow request:', actionError);
    }
  };

  const handleRejectFollowRequest = async (followId: string) => {
    try {
      await reject(followId);
    } catch (actionError) {
      logger.error('Failed to reject follow request:', actionError);
    }
  };

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Container maxWidth="sm">
        <Stack spacing={2.5}>
          <Stack spacing={1.5}>
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '2.1rem', md: '2.5rem' } }}>
              Notifications
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              {unreadCount > 0 ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MarkAllReadIcon />}
                  onClick={handleMarkAllAsRead}
                  disabled={isMutating}
                >
                  Mark all read
                </Button>
              ) : null}
            </Stack>
          </Stack>

          {feedItems.length > 0 && (error || followRequestsError) ? (
            <Alert severity="warning">
              Part of your notification activity is unavailable right now, but the rest of the feed is still loaded.
            </Alert>
          ) : null}

          {isLoadingFeed || isRefreshing ? (
            <NotificationsSkeleton />
          ) : blockingError ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="error" fontWeight={700}>
                We couldn&apos;t load your notifications.
              </Typography>
              <Button onClick={() => void handleRefresh()} sx={{ mt: 2 }}>
                Try again
              </Button>
            </Box>
          ) : groupedFeed.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography fontWeight={700}>You&apos;re all caught up.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                When new activity happens, it&apos;ll show up here.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {groupedFeed.map((group, groupIndex) => (
                <React.Fragment key={group.label}>
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      letterSpacing: 0.2,
                      mt: groupIndex === 0 ? 0 : 2,
                      mb: 0.75,
                      px: 2,
                    }}
                  >
                    {group.label}
                  </Typography>

                  {group.items.map((item) => (
                    <React.Fragment key={item.id}>
                      {item.kind === 'notification' ? (
                        <NotificationItem
                          notification={item.notification}
                          onMarkRead={handleMarkAsRead}
                          onMarkUnread={handleMarkAsUnread}
                          onDelete={handleDelete}
                          isLoading={notificationActionsLoading}
                        />
                      ) : item.request.follower ? (
                        <PendingFollowRequestItem
                          followId={item.request.followId}
                          follower={item.request.follower}
                          approvalStatus={item.request.approvalStatus}
                          createdAt={item.request.createdAt}
                          updatedAt={item.request.updatedAt}
                          onAccept={handleAcceptFollowRequest}
                          onReject={handleRejectFollowRequest}
                          isLoading={followActionsLoading}
                        />
                      ) : null}
                      <Divider />
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}

              {hasMore ? (
                <Box
                  ref={loadMoreTriggerRef}
                  sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: 48 }}
                >
                  {loadingMore ? <CircularProgress size={18} /> : null}
                </Box>
              ) : null}
            </List>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
