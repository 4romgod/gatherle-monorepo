import type { Notification, NotificationTargetType, CreateNotificationInput } from '@gatherle/commons/types';
import { NotificationType, ParticipantStatus } from '@gatherle/commons/types';
import { NotificationDAO, UserDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { publishNotificationCreated, publishNotificationsCreated } from '@/websocket/publisher';

/**
 * Parameters for creating a notification
 *
 * For actionUrl generation:
 * - User notifications (FOLLOW_*): uses actorUserId to fetch username
 * - Event notifications: targetSlug should be the event slug
 * - Organization notifications: targetSlug should be the org slug
 * - Security notifications: no targetSlug needed
 */
export interface NotifyParams {
  type: NotificationType;
  recipientUserId: string;
  actorUserId?: string;
  targetType?: NotificationTargetType;
  /** The slug (or identifier) used to build the actionUrl. For events/orgs, this should be the slug. */
  targetSlug?: string;
  actionUrl?: string;
  // Optional overrides for title/message (otherwise generated from type)
  title?: string;
  message?: string;
  rsvpStatus?: ParticipantStatus;
}

/**
 * Notification content templates for each type
 *
 * actionUrlTemplate receives:
 * - targetSlug: the event/org slug for navigation
 * - actorUsername: the actor's username (for social notifications)
 */
interface NotificationTemplate {
  title: string;
  message: (actorName?: string, rsvpStatus?: ParticipantStatus) => string;
  actionUrlTemplate?: (targetSlug?: string, actorUsername?: string) => string | undefined;
}

const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  // Social - uses actorUsername for profile links
  [NotificationType.FOLLOW_RECEIVED]: {
    title: 'New Follower',
    message: (actorName) => `${actorName || 'Someone'} started following you`,
    actionUrlTemplate: (_targetSlug, actorUsername) => (actorUsername ? `/users/${actorUsername}` : undefined),
  },
  [NotificationType.FOLLOW_REQUEST]: {
    title: 'Follow Request',
    message: (actorName) => `${actorName || 'Someone'} requested to follow you`,
    actionUrlTemplate: (_targetSlug, actorUsername) => (actorUsername ? `/users/${actorUsername}` : undefined),
  },
  [NotificationType.FOLLOW_ACCEPTED]: {
    title: 'Follow Request Accepted',
    message: (actorName) => `${actorName || 'Someone'} accepted your follow request`,
    actionUrlTemplate: (_targetSlug, actorUsername) => (actorUsername ? `/users/${actorUsername}` : undefined),
  },
  [NotificationType.MENTION]: {
    title: 'You were mentioned',
    message: (actorName) => `${actorName || 'Someone'} mentioned you in a comment`,
  },

  // Events - targetSlug should be the event slug
  [NotificationType.EVENT_RSVP]: {
    title: 'New RSVP',
    message: (actorName, rsvpStatus) => {
      const name = actorName || 'Someone';
      switch (rsvpStatus) {
        case ParticipantStatus.Going:
          return `${name} is going to your event`;
        case ParticipantStatus.Interested:
          return `${name} is interested in your event`;
        case ParticipantStatus.Waitlisted:
          return `${name} joined the waitlist for your event`;
        default:
          return `${name} RSVP'd to your event`;
      }
    },
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.EVENT_SAVED]: {
    title: 'Event Saved',
    message: (actorName) => `${actorName || 'Someone'} saved your event`,
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.EVENT_CHECKIN]: {
    title: 'Event Check-in',
    message: (actorName) => `${actorName || 'Someone'} checked in to your event`,
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.EVENT_REMINDER_24H]: {
    title: 'Event Tomorrow',
    message: () => 'Your event is happening tomorrow',
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.EVENT_REMINDER_1H]: {
    title: 'Event Starting Soon',
    message: () => 'Your event starts in 1 hour',
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.EVENT_UPDATED]: {
    title: 'Event Updated',
    message: () => 'An event you saved has been updated',
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.EVENT_CANCELLED]: {
    title: 'Event Cancelled',
    message: () => 'An event you saved has been cancelled',
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.EVENT_RECOMMENDATION]: {
    title: 'Event Recommendation',
    message: () => 'Check out this event that matches your interests',
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },

  // Organizations - targetSlug should be the org slug
  [NotificationType.ORG_INVITE]: {
    title: 'Organization Invite',
    message: () => 'You have been invited to join an organization',
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/organizations/${targetSlug}` : undefined),
  },
  [NotificationType.ORG_ROLE_CHANGED]: {
    title: 'Role Changed',
    message: () => 'Your role in an organization has been updated',
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/organizations/${targetSlug}` : undefined),
  },
  [NotificationType.ORG_EVENT_PUBLISHED]: {
    title: 'New Event',
    message: () => 'An organization you follow published a new event',
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },

  // Friend Activity - targetSlug should be the event slug
  [NotificationType.FRIEND_RSVP]: {
    title: 'Friend Activity',
    message: (actorName) => `${actorName || 'A friend'} is going to an event`,
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.FRIEND_CHECKIN]: {
    title: 'Friend Activity',
    message: (actorName) => `${actorName || 'A friend'} checked in to an event`,
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },

  // Comments - targetSlug should be the event slug (comments are on events)
  [NotificationType.COMMENT_RECEIVED]: {
    title: 'New Comment',
    message: (actorName) => `${actorName || 'Someone'} commented on your event`,
    actionUrlTemplate: (targetSlug) => (targetSlug ? `/events/${targetSlug}` : undefined),
  },
  [NotificationType.COMMENT_REPLY]: {
    title: 'New Reply',
    message: (actorName) => `${actorName || 'Someone'} replied to your comment`,
  },
  [NotificationType.COMMENT_LIKED]: {
    title: 'Comment Liked',
    message: (actorName) => `${actorName || 'Someone'} liked your comment`,
  },

  // Security
  [NotificationType.PASSWORD_CHANGED]: {
    title: 'Password Changed',
    message: () => 'Your password was successfully changed',
    actionUrlTemplate: () => '/account',
  },
  [NotificationType.NEW_DEVICE_LOGIN]: {
    title: 'New Login Detected',
    message: () => 'A new device logged into your account',
    actionUrlTemplate: () => '/account',
  },
  [NotificationType.ACCOUNT_VERIFIED]: {
    title: 'Account Verified',
    message: () => 'Your account has been verified',
  },
};

/**
 * Central service for creating and managing notifications
 */
class NotificationService {
  /**
   * Create a notification for a single user
   */
  static async notify(params: NotifyParams): Promise<Notification> {
    const {
      type,
      recipientUserId,
      actorUserId,
      targetType,
      targetSlug,
      actionUrl,
      title: customTitle,
      message: customMessage,
      rsvpStatus,
    } = params;

    // Don't notify yourself
    if (actorUserId && actorUserId === recipientUserId) {
      logger.debug('Skipping self-notification', { type, recipientUserId });
      throw new Error('Cannot notify yourself');
    }

    // Get actor info for message personalization and URL generation
    let actorName: string | undefined;
    let actorUsername: string | undefined;
    if (actorUserId) {
      try {
        const actor = await UserDAO.readUserById(actorUserId);
        actorName = actor.given_name || actor.username;
        actorUsername = actor.username;
      } catch {
        logger.warn('Could not fetch actor for notification', { actorUserId });
      }
    }

    // Get template for this notification type
    const template = NOTIFICATION_TEMPLATES[type];

    // Generate title and message
    const title = customTitle || template.title;
    const message = customMessage || template.message(actorName, rsvpStatus);

    // Generate action URL
    let generatedActionUrl = actionUrl;
    if (!generatedActionUrl && template.actionUrlTemplate) {
      generatedActionUrl = template.actionUrlTemplate(targetSlug, actorUsername) || undefined;
    }

    const input: CreateNotificationInput = {
      recipientUserId,
      type,
      title,
      message,
      actorUserId,
      targetType,
      targetId: targetSlug, // Store slug in targetId field for reference
      actionUrl: generatedActionUrl,
    };

    logger.info('Creating notification', { type, recipientUserId, actorUserId });

    const notification = await NotificationDAO.create(input);

    await publishNotificationCreated(notification);

    // TODO: Future - dispatch to email/push based on user preferences
    // await this.dispatchToChannels(notification, recipientUserId);

    return notification;
  }

  /**
   * Create notifications for multiple users (e.g., event update to all attendees)
   */
  static async notifyMany(
    recipientUserIds: string[],
    params: Omit<NotifyParams, 'recipientUserId'>,
  ): Promise<Notification[]> {
    const {
      type,
      actorUserId,
      targetType,
      targetSlug,
      actionUrl,
      title: customTitle,
      message: customMessage,
      rsvpStatus,
    } = params;

    // Filter out actor from recipients (don't notify yourself)
    const filteredRecipients = actorUserId ? recipientUserIds.filter((id) => id !== actorUserId) : recipientUserIds;

    if (filteredRecipients.length === 0) {
      logger.debug('No recipients for bulk notification after filtering', { type });
      return [];
    }

    // Get actor info for message personalization and URL generation
    let actorName: string | undefined;
    let actorUsername: string | undefined;
    if (actorUserId) {
      try {
        const actor = await UserDAO.readUserById(actorUserId);
        actorName = actor.given_name || actor.username;
        actorUsername = actor.username;
      } catch {
        logger.warn('Could not fetch actor for notification', { actorUserId });
      }
    }

    // Get template
    const template = NOTIFICATION_TEMPLATES[type];
    const title = customTitle || template.title;
    const message = customMessage || template.message(actorName, rsvpStatus);

    // Generate action URL
    let generatedActionUrl = actionUrl;
    if (!generatedActionUrl && template.actionUrlTemplate) {
      generatedActionUrl = template.actionUrlTemplate(targetSlug, actorUsername) || undefined;
    }

    // Create inputs for all recipients
    const inputs: CreateNotificationInput[] = filteredRecipients.map((recipientUserId) => ({
      recipientUserId,
      type,
      title,
      message,
      actorUserId,
      targetType,
      targetId: targetSlug, // Store slug in targetId field for reference
      actionUrl: generatedActionUrl,
    }));

    logger.info('Creating bulk notifications', {
      type,
      recipientCount: inputs.length,
      actorUserId,
    });

    const notifications = await NotificationDAO.createMany(inputs);

    await publishNotificationsCreated(notifications);

    // TODO: Future - dispatch to email/push based on user preferences
    return notifications;
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return NotificationDAO.countUnread(userId);
  }

  /**
   * Mark follow request notifications as read for the recipient
   */
  static async markFollowRequestNotificationsAsRead(recipientUserId: string, actorUserId: string): Promise<number> {
    return NotificationDAO.markFollowRequestNotificationsAsRead(recipientUserId, actorUserId);
  }

  /**
   * Future: Dispatch notification to appropriate channels (email, push) based on user preferences
   */
  // private static async dispatchToChannels(
  //     notification: Notification,
  //     recipientUserId: string,
  // ): Promise<void> {
  //     // Get user preferences
  //     const user = await UserDAO.readUserById(recipientUserId);
  //     const prefs = user.preferences?.communicationPrefs;

  //     // Send email if enabled
  //     if (prefs?.emailEnabled) {
  //         // await EmailService.sendNotificationEmail(notification, user);
  //         await NotificationDAO.markEmailSent(notification.notificationId);
  //     }

  //     // Send push if enabled
  //     if (prefs?.pushEnabled) {
  //         // await PushService.sendPushNotification(notification, user);
  //         await NotificationDAO.markPushSent(notification.notificationId);
  //     }
  // }
}

export default NotificationService;
