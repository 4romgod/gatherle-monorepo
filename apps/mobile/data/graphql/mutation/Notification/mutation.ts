import { graphql } from '../../types';

export const MarkNotificationReadDocument = graphql(`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) {
      notificationId
      isRead
      readAt
    }
  }
`);

export const MarkAllNotificationsReadDocument = graphql(`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`);

export const DeleteNotificationDocument = graphql(`
  mutation DeleteNotification($notificationId: ID!) {
    deleteNotification(notificationId: $notificationId)
  }
`);
