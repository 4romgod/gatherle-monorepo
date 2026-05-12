import { graphql } from '../../types';

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

export const GetUnreadNotificationCountDocument = graphql(`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`);
