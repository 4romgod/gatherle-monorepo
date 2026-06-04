import type {
  Notification,
  EventMoment,
  FollowApprovalStatus,
  FollowTargetType,
  ParticipantStatus,
  ParticipantVisibility,
} from '@gatherle/commons/server/types';
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

interface NotificationDeletedEventPayload {
  notificationId: string;
  unreadCount: number;
}

interface NotificationAllReadEventPayload {
  unreadCount: number;
  readAt: string;
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
  occurrenceId?: string;
  occurrenceKey?: string;
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

interface EventSaveUpdatedPayload {
  eventId: string;
  isSaved: boolean;
  followId?: string | null;
}

export interface RealtimeMomentSnapshot {
  momentId: string;
  eventId: string;
  occurrenceId?: string | null;
  authorId: string;
  type: EventMoment['type'];
  state: EventMoment['state'];
  caption?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  imageDisplayMode?: EventMoment['imageDisplayMode'] | null;
  background?: string | null;
  durationSeconds?: number | null;
  expiresAt: string;
  createdAt: string;
  author: {
    userId: string;
    username: string;
    given_name: string;
    family_name: string;
    profile_picture?: string | null;
  };
  event: {
    eventId: string;
    slug: string;
    title: string;
  };
}

interface MomentCreatedPayload {
  moment: RealtimeMomentSnapshot;
}

interface MomentUpdatedPayload {
  moment: RealtimeMomentSnapshot;
}

interface MomentDeletedPayload {
  momentId: string;
  eventId: string;
  occurrenceId?: string | null;
  authorId: string;
}

const normalizeRecipientUserIds = (recipientUserIds: string[]): string[] => [
  ...new Set(recipientUserIds.map((userId) => userId.trim()).filter((userId) => userId.length > 0)),
];

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

export const publishNotificationUpdated = async (notification: Notification): Promise<void> => {
  try {
    const userId = notification.recipientUserId;
    const unreadCount = await NotificationDAO.countUnread(userId);
    const eventPayload: RealtimeEventEnvelope<NotificationEventPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.NOTIFICATION_UPDATED,
      {
        notification,
        unreadCount,
      },
    );

    await publishToUserConnections(userId, eventPayload, {
      notificationId: notification.notificationId,
    });
  } catch (error) {
    logger.error('Failed to publish notification.updated event', {
      error,
      recipientUserId: notification.recipientUserId,
      notificationId: notification.notificationId,
    });
  }
};

export const publishNotificationDeleted = async (recipientUserId: string, notificationId: string): Promise<void> => {
  try {
    const unreadCount = await NotificationDAO.countUnread(recipientUserId);
    const eventPayload: RealtimeEventEnvelope<NotificationDeletedEventPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.NOTIFICATION_DELETED,
      {
        notificationId,
        unreadCount,
      },
    );

    await publishToUserConnections(recipientUserId, eventPayload, {
      notificationId,
    });
  } catch (error) {
    logger.error('Failed to publish notification.deleted event', {
      error,
      recipientUserId,
      notificationId,
    });
  }
};

export const publishNotificationsMarkedAllRead = async (recipientUserId: string, readAt: string): Promise<void> => {
  try {
    const unreadCount = await NotificationDAO.countUnread(recipientUserId);
    const eventPayload: RealtimeEventEnvelope<NotificationAllReadEventPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.NOTIFICATION_ALL_READ,
      {
        unreadCount,
        readAt,
      },
    );

    await publishToUserConnections(recipientUserId, eventPayload, {
      readAt,
    });
  } catch (error) {
    logger.error('Failed to publish notification.all_read event', {
      error,
      recipientUserId,
      readAt,
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
    const uniqueRecipientUserIds = normalizeRecipientUserIds(recipientUserIds);

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

export const publishEventSaveUpdated = async (
  recipientUserId: string,
  payload: EventSaveUpdatedPayload,
): Promise<void> => {
  try {
    const uniqueRecipientUserIds = normalizeRecipientUserIds([recipientUserId]);

    if (uniqueRecipientUserIds.length === 0) {
      return;
    }

    const eventPayload: RealtimeEventEnvelope<EventSaveUpdatedPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.EVENT_SAVE_UPDATED,
      payload,
    );

    await Promise.all(
      uniqueRecipientUserIds.map(async (resolvedRecipientUserId) => {
        await publishToUserConnections(resolvedRecipientUserId, eventPayload, {
          eventId: payload.eventId,
          isSaved: payload.isSaved,
          followId: payload.followId ?? null,
        });
      }),
    );
  } catch (error) {
    logger.error('Failed to publish event.save.updated event', {
      error,
      recipientUserId,
      eventId: payload.eventId,
      isSaved: payload.isSaved,
    });
  }
};

export const publishMomentCreated = async (recipientUserId: string, payload: MomentCreatedPayload): Promise<void> => {
  try {
    const eventPayload: RealtimeEventEnvelope<MomentCreatedPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.MOMENT_CREATED,
      payload,
    );

    const uniqueRecipientUserIds = normalizeRecipientUserIds([recipientUserId]);

    await Promise.all(
      uniqueRecipientUserIds.map(async (resolvedRecipientUserId) => {
        await publishToUserConnections(resolvedRecipientUserId, eventPayload, {
          momentId: payload.moment.momentId,
          eventId: payload.moment.eventId,
          authorId: payload.moment.authorId,
        });
      }),
    );
  } catch (error) {
    logger.error('Failed to publish moment.created event', {
      error,
      recipientUserId,
      momentId: payload.moment.momentId,
      eventId: payload.moment.eventId,
    });
  }
};

export const publishMomentCreatedToRecipients = async (
  recipientUserIds: string[],
  payload: MomentCreatedPayload,
): Promise<void> => {
  try {
    const uniqueRecipientUserIds = normalizeRecipientUserIds(recipientUserIds);

    if (uniqueRecipientUserIds.length === 0) {
      return;
    }

    const eventPayload: RealtimeEventEnvelope<MomentCreatedPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.MOMENT_CREATED,
      payload,
    );

    await Promise.all(
      uniqueRecipientUserIds.map(async (recipientUserId) => {
        await publishToUserConnections(recipientUserId, eventPayload, {
          momentId: payload.moment.momentId,
          eventId: payload.moment.eventId,
          authorId: payload.moment.authorId,
        });
      }),
    );
  } catch (error) {
    logger.error('Failed to publish moment.created event', {
      error,
      recipientUserIds,
      momentId: payload.moment.momentId,
      eventId: payload.moment.eventId,
    });
  }
};

export const publishMomentUpdatedToRecipients = async (
  recipientUserIds: string[],
  payload: MomentUpdatedPayload,
): Promise<void> => {
  try {
    const uniqueRecipientUserIds = normalizeRecipientUserIds(recipientUserIds);

    if (uniqueRecipientUserIds.length === 0) {
      return;
    }

    const eventPayload: RealtimeEventEnvelope<MomentUpdatedPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.MOMENT_UPDATED,
      payload,
    );

    await Promise.all(
      uniqueRecipientUserIds.map(async (recipientUserId) => {
        await publishToUserConnections(recipientUserId, eventPayload, {
          momentId: payload.moment.momentId,
          eventId: payload.moment.eventId,
          authorId: payload.moment.authorId,
          state: payload.moment.state,
        });
      }),
    );
  } catch (error) {
    logger.error('Failed to publish moment.updated event', {
      error,
      recipientUserIds,
      momentId: payload.moment.momentId,
      eventId: payload.moment.eventId,
      state: payload.moment.state,
    });
  }
};

export const publishMomentDeleted = async (recipientUserId: string, payload: MomentDeletedPayload): Promise<void> => {
  try {
    const eventPayload: RealtimeEventEnvelope<MomentDeletedPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.MOMENT_DELETED,
      payload,
    );

    const uniqueRecipientUserIds = normalizeRecipientUserIds([recipientUserId]);

    await Promise.all(
      uniqueRecipientUserIds.map(async (resolvedRecipientUserId) => {
        await publishToUserConnections(resolvedRecipientUserId, eventPayload, {
          momentId: payload.momentId,
          eventId: payload.eventId,
          authorId: payload.authorId,
        });
      }),
    );
  } catch (error) {
    logger.error('Failed to publish moment.deleted event', {
      error,
      recipientUserId,
      momentId: payload.momentId,
      eventId: payload.eventId,
    });
  }
};

export const publishMomentDeletedToRecipients = async (
  recipientUserIds: string[],
  payload: MomentDeletedPayload,
): Promise<void> => {
  try {
    const uniqueRecipientUserIds = normalizeRecipientUserIds(recipientUserIds);

    if (uniqueRecipientUserIds.length === 0) {
      return;
    }

    const eventPayload: RealtimeEventEnvelope<MomentDeletedPayload> = createRealtimeEventEnvelope(
      WEBSOCKET_EVENT_TYPES.MOMENT_DELETED,
      payload,
    );

    await Promise.all(
      uniqueRecipientUserIds.map(async (recipientUserId) => {
        await publishToUserConnections(recipientUserId, eventPayload, {
          momentId: payload.momentId,
          eventId: payload.eventId,
          authorId: payload.authorId,
        });
      }),
    );
  } catch (error) {
    logger.error('Failed to publish moment.deleted event', {
      error,
      recipientUserIds,
      momentId: payload.momentId,
      eventId: payload.eventId,
    });
  }
};
