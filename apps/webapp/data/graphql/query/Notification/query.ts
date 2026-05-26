import { graphql } from '@/data/graphql/types';

/**
 * Fetch paginated notifications for the authenticated user
 */
export const GetNotificationsDocument = graphql(`
  query GetNotifications($limit: Int, $cursor: String, $unreadOnly: Boolean) {
    notifications(limit: $limit, cursor: $cursor, unreadOnly: $unreadOnly) {
      notifications {
        notificationId
        recipientUserId
        type
        title
        message
        actorUserId
        actor {
          userId
          username
          given_name
          family_name
          profile_picture
        }
        targetType
        targetId
        isRead
        readAt
        actionUrl
        createdAt
      }
      nextCursor
      hasMore
      unreadCount
    }
  }
`);

/**
 * Get the count of unread notifications
 */
export const GetUnreadNotificationCountDocument = graphql(`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`);

/**
 * Mark a single notification as read
 */
export const MarkNotificationReadDocument = graphql(`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) {
      notificationId
      isRead
      readAt
    }
  }
`);

export const MarkNotificationUnreadDocument = graphql(`
  mutation MarkNotificationUnread($notificationId: ID!) {
    markNotificationUnread(notificationId: $notificationId) {
      notificationId
      isRead
      readAt
    }
  }
`);

/**
 * Mark all notifications as read
 */
export const MarkAllNotificationsReadDocument = graphql(`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`);

/**
 * Delete a notification
 */
export const DeleteNotificationDocument = graphql(`
  mutation DeleteNotification($notificationId: ID!) {
    deleteNotification(notificationId: $notificationId)
  }
`);
