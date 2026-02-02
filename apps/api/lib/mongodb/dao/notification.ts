import { GraphQLError } from 'graphql';
import type {
  Notification as NotificationEntity,
  CreateNotificationInput,
  NotificationConnection,
} from '@ntlango/commons/types';
import { NotificationType } from '@ntlango/commons';
import { Notification as NotificationModel } from '@/mongodb/models';
import { KnownCommonError } from '@/utils';
import { logger } from '@/utils/logger';

export interface ReadNotificationsOptions {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

class NotificationDAO {
  /**
   * Create a single notification
   */
  static async create(input: CreateNotificationInput): Promise<NotificationEntity> {
    try {
      const notification = await NotificationModel.create({
        ...input,
        isRead: false,
        emailSent: false,
        pushSent: false,
      });
      return notification.toObject();
    } catch (error) {
      logger.error('Error creating notification', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  /**
   * Create multiple notifications (for bulk notifications like event updates)
   */
  static async createMany(inputs: CreateNotificationInput[]): Promise<NotificationEntity[]> {
    try {
      const notificationsData = inputs.map((input) => ({
        ...input,
        isRead: false,
        emailSent: false,
        pushSent: false,
      }));
      const notifications = await NotificationModel.insertMany(notificationsData);
      return notifications.map((n) => n.toObject());
    } catch (error) {
      logger.error('Error creating notifications in bulk', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  /**
   * Read notifications for a user with cursor-based pagination
   */
  static async readByUserId(userId: string, options: ReadNotificationsOptions = {}): Promise<NotificationConnection> {
    const { limit = 20, cursor, unreadOnly = false } = options;
    const fetchLimit = limit + 1; // Fetch one extra to determine hasMore

    try {
      const query: Record<string, unknown> = { recipientUserId: userId };

      // If cursor provided, fetch notifications older than the cursor
      if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
      }

      // If unreadOnly, filter to unread notifications
      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await NotificationModel.find(query).sort({ createdAt: -1 }).limit(fetchLimit).exec();

      const hasMore = notifications.length > limit;
      const results = hasMore ? notifications.slice(0, limit) : notifications;

      // Get unread count
      const unreadCount = await this.countUnread(userId);

      return {
        notifications: results.map((n) => n.toObject()),
        nextCursor: hasMore && results.length > 0 ? results[results.length - 1].createdAt.toISOString() : undefined,
        hasMore,
        unreadCount,
      };
    } catch (error) {
      logger.error('Error reading notifications for user', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Count unread notifications for a user
   */
  static async countUnread(userId: string): Promise<number> {
    try {
      return await NotificationModel.countDocuments({
        recipientUserId: userId,
        isRead: false,
      }).exec();
    } catch (error) {
      logger.error('Error counting unread notifications', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<NotificationEntity | null> {
    try {
      const notification = await NotificationModel.findOneAndUpdate(
        { notificationId, recipientUserId: userId },
        { isRead: true, readAt: new Date() },
        { new: true },
      ).exec();

      return notification ? notification.toObject() : null;
    } catch (error) {
      logger.error('Error marking notification as read', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await NotificationModel.updateMany(
        { recipientUserId: userId, isRead: false },
        { isRead: true, readAt: new Date() },
      ).exec();
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error marking all notifications as read', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Mark the follow request notification associated with a follower as read.
   */
  static async markFollowRequestNotificationsAsRead(recipientUserId: string, actorUserId: string): Promise<number> {
    try {
      const result = await NotificationModel.updateMany(
        {
          recipientUserId,
          actorUserId,
          type: NotificationType.FOLLOW_REQUEST,
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        },
      ).exec();
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error marking follow request notifications as read', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Delete a notification
   */
  static async delete(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await NotificationModel.deleteOne({
        notificationId,
        recipientUserId: userId,
      }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting notification', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Read a single notification by ID
   */
  static async readById(notificationId: string): Promise<NotificationEntity | null> {
    try {
      const notification = await NotificationModel.findOne({ notificationId }).exec();
      return notification ? notification.toObject() : null;
    } catch (error) {
      logger.error('Error reading notification by ID', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Update email sent status
   */
  static async markEmailSent(notificationId: string): Promise<void> {
    try {
      await NotificationModel.updateOne({ notificationId }, { emailSent: true }).exec();
    } catch (error) {
      logger.error('Error marking email as sent', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Update push sent status
   */
  static async markPushSent(notificationId: string): Promise<void> {
    try {
      await NotificationModel.updateOne({ notificationId }, { pushSent: true }).exec();
    } catch (error) {
      logger.error('Error marking push as sent', error);
      throw KnownCommonError(error);
    }
  }
}

export default NotificationDAO;
