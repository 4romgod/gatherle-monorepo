import type { ApolloClient } from '@apollo/client';
import { GetPendingFollowRequestsDocument } from '@data/graphql/query/Follow/query';
import { GetNotificationsDocument, GetUnreadNotificationCountDocument } from '@data/graphql/query/Notification/query';
import { FollowApprovalStatus, FollowTargetType } from '@data/graphql/types/graphql';
import type {
  MobileRealtimeFollowRequestPayload,
  MobileRealtimeNotificationDeletedPayload,
  MobileRealtimeNotificationPayload,
  MobileRealtimeNotificationsAllReadPayload,
} from './notificationRealtimeProtocol';

const DEFAULT_NOTIFICATION_PAGE_LIMIT = 24;

interface CreateMobileNotificationRealtimeCacheHandlersParams {
  client: ApolloClient<object>;
  userId: string;
}

export const createMobileNotificationRealtimeCacheHandlers = ({
  client,
  userId,
}: CreateMobileNotificationRealtimeCacheHandlersParams) => {
  const writeUnreadNotificationCount = (unreadCount: number) => {
    client.writeQuery({
      query: GetUnreadNotificationCountDocument,
      data: {
        unreadNotificationCount: unreadCount,
      },
    });
  };

  const handleRealtimeNotification = (payload: MobileRealtimeNotificationPayload) => {
    writeUnreadNotificationCount(payload.unreadCount);

    client.cache.updateQuery(
      {
        query: GetNotificationsDocument,
        variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT },
      },
      (existing) => {
        if (!existing?.notifications) {
          return existing;
        }

        const currentItems = existing.notifications.notifications;
        const existingIndex = currentItems.findIndex(
          (item) => item.notificationId === payload.notification.notificationId,
        );
        const maxItems = Math.max(currentItems.length, DEFAULT_NOTIFICATION_PAGE_LIMIT);

        const nextItems =
          existingIndex >= 0
            ? currentItems.map((item, index) =>
                index === existingIndex
                  ? ({
                      ...item,
                      ...payload.notification,
                    } as (typeof currentItems)[number])
                  : item,
              )
            : [payload.notification as (typeof currentItems)[number], ...currentItems].slice(0, maxItems);

        return {
          ...existing,
          notifications: {
            ...existing.notifications,
            unreadCount: payload.unreadCount,
            notifications: nextItems,
          },
        };
      },
    );
  };

  const handleRealtimeNotificationDeleted = (payload: MobileRealtimeNotificationDeletedPayload) => {
    writeUnreadNotificationCount(payload.unreadCount);

    client.cache.updateQuery(
      {
        query: GetNotificationsDocument,
        variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT },
      },
      (existing) => {
        if (!existing?.notifications) {
          return existing;
        }

        return {
          ...existing,
          notifications: {
            ...existing.notifications,
            unreadCount: payload.unreadCount,
            notifications: existing.notifications.notifications.filter(
              (item) => item.notificationId !== payload.notificationId,
            ),
          },
        };
      },
    );
  };

  const handleRealtimeNotificationsAllRead = (payload: MobileRealtimeNotificationsAllReadPayload) => {
    writeUnreadNotificationCount(payload.unreadCount);

    client.cache.updateQuery(
      {
        query: GetNotificationsDocument,
        variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT },
      },
      (existing) => {
        if (!existing?.notifications) {
          return existing;
        }

        return {
          ...existing,
          notifications: {
            ...existing.notifications,
            unreadCount: payload.unreadCount,
            notifications: existing.notifications.notifications.map((item) => ({
              ...item,
              isRead: true,
              readAt: item.readAt ?? payload.readAt,
            })),
          },
        };
      },
    );
  };

  const handleRealtimeFollowRequest = (payload: MobileRealtimeFollowRequestPayload) => {
    if (payload.follow.targetType !== FollowTargetType.User || payload.follow.targetId !== userId) {
      return;
    }

    client.cache.updateQuery(
      {
        query: GetPendingFollowRequestsDocument,
        variables: { targetType: FollowTargetType.User },
      },
      (existing) => {
        if (!existing?.readPendingFollowRequests) {
          return existing;
        }

        const currentItems = existing.readPendingFollowRequests;
        const existingIndex = currentItems.findIndex((item) => item.followId === payload.follow.followId);
        const isStillPending = payload.follow.approvalStatus === FollowApprovalStatus.Pending;

        let nextItems = currentItems;
        if (existingIndex >= 0) {
          nextItems = isStillPending
            ? currentItems.map((item, index) =>
                index === existingIndex
                  ? ({
                      ...item,
                      ...payload.follow,
                    } as (typeof currentItems)[number])
                  : item,
              )
            : currentItems.filter((item) => item.followId !== payload.follow.followId);
        } else if (isStillPending) {
          nextItems = [payload.follow as (typeof currentItems)[number], ...currentItems];
        }

        nextItems = [...nextItems].sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        );

        return {
          ...existing,
          readPendingFollowRequests: nextItems,
        };
      },
    );
  };

  return {
    handleRealtimeNotification,
    handleRealtimeNotificationDeleted,
    handleRealtimeNotificationsAllRead,
    handleRealtimeFollowRequest,
  };
};
