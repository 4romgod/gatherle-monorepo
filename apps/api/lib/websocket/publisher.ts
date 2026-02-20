import type {
  Notification,
  FollowApprovalStatus,
  FollowTargetType,
  ParticipantStatus,
  ParticipantVisibility,
} from '@gatherle/commons/types';
import { NotificationDAO, WebSocketConnectionDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { WEBSOCKET_EVENT_TYPES } from '@/websocket/constants';
import {
  createRealtimeEventEnvelope,
  isGoneConnectionError,
  postToConnection,
  type RealtimeEventEnvelope,
} from '@/websocket/gateway';

interface NotificationEventPayload {
  notification: Notification;
  unreadCount: number;
}

export interface FollowRequestRealtimeSnapshot {
  followId: string;
  followerUserId: string;
  targetType: FollowTargetType;
  targetId: string;
  approvalStatus: FollowApprovalStatus;
  createdAt: string;
  updatedAt: string;
  follower: {
    userId: string;
    username: string;
    email: string;
    given_name: string;
    family_name: string;
    profile_picture?: string | null;
    bio?: string | null;
  };
}

interface FollowRequestEventPayload {
  follow: FollowRequestRealtimeSnapshot;
}

export interface EventRsvpRealtimeSnapshot {
  participantId: string;
  eventId: string;
  userId: string;
  status: ParticipantStatus;
  quantity?: number | null;
  sharedVisibility?: ParticipantVisibility | null;
  rsvpAt?: string | null;
  cancelledAt?: string | null;
  checkedInAt?: string | null;
  user: {
    userId: string;
    username: string;
    given_name: string;
    family_name: string;
    profile_picture?: string | null;
  };
}

interface EventRsvpUpdatedPayload {
  participant: EventRsvpRealtimeSnapshot;
  previousStatus: ParticipantStatus | null;
  rsvpCount: number;
}

const publishToUserConnections = async <TPayload>(
  userId: string,
  eventPayload: RealtimeEventEnvelope<TPayload>,
  logContext: Record<string, unknown>,
): Promise<void> => {
  const connections = await WebSocketConnectionDAO.readConnectionsByUserId(userId);

  if (connections.length === 0) {
    logger.debug('No active websocket connections for recipient', { userId, eventType: eventPayload.type });
    return;
  }

  await Promise.all(
    connections.map(async (connection) => {
      try {
        await postToConnection(connection, eventPayload);
      } catch (error) {
        if (isGoneConnectionError(error)) {
          await WebSocketConnectionDAO.removeConnection(connection.connectionId);
          logger.info('Removed stale websocket connection after GoneException', {
            connectionId: connection.connectionId,
            userId,
            eventType: eventPayload.type,
          });
          return;
        }

        logger.warn('Failed to publish websocket event', {
          connectionId: connection.connectionId,
          userId,
          eventType: eventPayload.type,
          error,
          ...logContext,
        });
      }
    }),
  );
};

export const publishNotificationCreated = async (notification: Notification): Promise<void> => {
  try {
    const userId = notification.recipientUserId;
    const unreadCount = await NotificationDAO.countUnread(userId);
    const eventPayload: RealtimeEventEnvelope<NotificationEventPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.NOTIFICATION_NEW,
      {
        notification,
        unreadCount,
      },
    );

    await publishToUserConnections(userId, eventPayload, {
      notificationId: notification.notificationId,
    });
  } catch (error) {
    logger.error('Failed to publish notification event', {
      error,
      recipientUserId: notification.recipientUserId,
      notificationId: notification.notificationId,
    });
  }
};

export const publishNotificationsCreated = async (notifications: Notification[]): Promise<void> => {
  await Promise.all(notifications.map((notification) => publishNotificationCreated(notification)));
};

export const publishFollowRequestCreated = async (
  recipientUserId: string,
  follow: FollowRequestRealtimeSnapshot,
): Promise<void> => {
  try {
    const eventPayload: RealtimeEventEnvelope<FollowRequestEventPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.FOLLOW_REQUEST_CREATED,
      { follow },
    );

    await publishToUserConnections(recipientUserId, eventPayload, {
      followId: follow.followId,
      approvalStatus: follow.approvalStatus,
    });
  } catch (error) {
    logger.error('Failed to publish follow.request.created event', {
      error,
      recipientUserId,
      followId: follow.followId,
    });
  }
};

export const publishFollowRequestUpdated = async (
  recipientUserId: string,
  follow: FollowRequestRealtimeSnapshot,
): Promise<void> => {
  try {
    const eventPayload: RealtimeEventEnvelope<FollowRequestEventPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.FOLLOW_REQUEST_UPDATED,
      { follow },
    );

    await publishToUserConnections(recipientUserId, eventPayload, {
      followId: follow.followId,
      approvalStatus: follow.approvalStatus,
    });
  } catch (error) {
    logger.error('Failed to publish follow.request.updated event', {
      error,
      recipientUserId,
      followId: follow.followId,
    });
  }
};

export const publishEventRsvpUpdated = async (
  recipientUserIds: string[],
  payload: EventRsvpUpdatedPayload,
): Promise<void> => {
  try {
    const uniqueRecipientUserIds = [...new Set(recipientUserIds.filter((userId) => userId.trim().length > 0))];

    if (uniqueRecipientUserIds.length === 0) {
      return;
    }

    const eventPayload: RealtimeEventEnvelope<EventRsvpUpdatedPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.EVENT_RSVP_UPDATED,
      payload,
    );

    await Promise.all(
      uniqueRecipientUserIds.map(async (recipientUserId) => {
        await publishToUserConnections(recipientUserId, eventPayload, {
          eventId: payload.participant.eventId,
          participantId: payload.participant.participantId,
          status: payload.participant.status,
        });
      }),
    );
  } catch (error) {
    logger.error('Failed to publish event.rsvp.updated event', {
      error,
      eventId: payload.participant.eventId,
      participantId: payload.participant.participantId,
    });
  }
};
