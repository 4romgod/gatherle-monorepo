import type { MobileFollowRequest } from '@data/graphql/query/Follow/types';
import type { MobileNotification } from '@data/graphql/query/Notification/types';
import {
  FollowApprovalStatus,
  FollowTargetType,
  ParticipantStatus,
  ParticipantVisibility,
} from '@data/graphql/types/graphql';

type RealtimeEnvelope = {
  payload?: unknown;
  type?: unknown;
};

type NotificationRealtimeEventType =
  | 'notification.new'
  | 'notification.updated'
  | 'notification.deleted'
  | 'notification.all_read'
  | 'follow.request.created'
  | 'follow.request.updated'
  | 'event.rsvp.updated';

export type MobileRealtimeNotificationPayload = {
  notification: MobileNotification;
  unreadCount: number;
};

export type MobileRealtimeNotificationDeletedPayload = {
  notificationId: string;
  unreadCount: number;
};

export type MobileRealtimeNotificationsAllReadPayload = {
  unreadCount: number;
  readAt: string;
};

export type MobileRealtimeFollowRequestPayload = {
  follow: MobileFollowRequest;
};

export type MobileRealtimeEventRsvpPayload = {
  participant: {
    participantId: string;
    eventId: string;
    occurrenceId?: string | null;
    occurrenceKey?: string | null;
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
  };
  previousStatus: ParticipantStatus | null;
  rsvpCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const isMobileRealtimeNotificationPayload = (value: unknown): value is MobileRealtimeNotificationPayload => {
  if (!isRecord(value) || !isRecord(value.notification)) {
    return false;
  }

  const notification = value.notification;
  return (
    typeof value.unreadCount === 'number' &&
    typeof notification.notificationId === 'string' &&
    typeof notification.recipientUserId === 'string' &&
    typeof notification.type === 'string' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string' &&
    typeof notification.isRead === 'boolean' &&
    typeof notification.createdAt === 'string'
  );
};

export const isMobileRealtimeNotificationDeletedPayload = (
  value: unknown,
): value is MobileRealtimeNotificationDeletedPayload => {
  return isRecord(value) && typeof value.notificationId === 'string' && typeof value.unreadCount === 'number';
};

export const isMobileRealtimeNotificationsAllReadPayload = (
  value: unknown,
): value is MobileRealtimeNotificationsAllReadPayload => {
  return isRecord(value) && typeof value.unreadCount === 'number' && typeof value.readAt === 'string';
};

export const isMobileRealtimeFollowRequestPayload = (value: unknown): value is MobileRealtimeFollowRequestPayload => {
  if (!isRecord(value) || !isRecord(value.follow)) {
    return false;
  }

  const follow = value.follow;
  return (
    typeof follow.followId === 'string' &&
    typeof follow.followerUserId === 'string' &&
    typeof follow.targetId === 'string' &&
    typeof follow.createdAt === 'string' &&
    typeof follow.updatedAt === 'string' &&
    Object.values(FollowTargetType).includes(follow.targetType as FollowTargetType) &&
    Object.values(FollowApprovalStatus).includes(follow.approvalStatus as FollowApprovalStatus)
  );
};

export const isMobileRealtimeEventRsvpPayload = (value: unknown): value is MobileRealtimeEventRsvpPayload => {
  if (!isRecord(value) || !isRecord(value.participant) || typeof value.rsvpCount !== 'number') {
    return false;
  }

  const participant = value.participant;
  const previousStatus = value.previousStatus;

  if (
    typeof participant.participantId !== 'string' ||
    typeof participant.eventId !== 'string' ||
    (participant.occurrenceId !== undefined &&
      participant.occurrenceId !== null &&
      typeof participant.occurrenceId !== 'string') ||
    (participant.occurrenceKey !== undefined &&
      participant.occurrenceKey !== null &&
      typeof participant.occurrenceKey !== 'string') ||
    typeof participant.userId !== 'string' ||
    !Object.values(ParticipantStatus).includes(participant.status as ParticipantStatus) ||
    (participant.quantity !== undefined && participant.quantity !== null && typeof participant.quantity !== 'number') ||
    (participant.sharedVisibility !== undefined &&
      participant.sharedVisibility !== null &&
      !Object.values(ParticipantVisibility).includes(participant.sharedVisibility as ParticipantVisibility)) ||
    (participant.rsvpAt !== undefined && participant.rsvpAt !== null && typeof participant.rsvpAt !== 'string') ||
    (participant.cancelledAt !== undefined &&
      participant.cancelledAt !== null &&
      typeof participant.cancelledAt !== 'string') ||
    (participant.checkedInAt !== undefined &&
      participant.checkedInAt !== null &&
      typeof participant.checkedInAt !== 'string') ||
    !isRecord(participant.user) ||
    (previousStatus !== null &&
      previousStatus !== undefined &&
      !Object.values(ParticipantStatus).includes(previousStatus as ParticipantStatus))
  ) {
    return false;
  }

  const actor = participant.user;

  return (
    typeof actor.userId === 'string' &&
    typeof actor.username === 'string' &&
    typeof actor.given_name === 'string' &&
    typeof actor.family_name === 'string' &&
    (typeof actor.profile_picture === 'string' || actor.profile_picture === null || actor.profile_picture === undefined)
  );
};

const isNotificationRealtimeEventType = (value: unknown): value is NotificationRealtimeEventType => {
  return (
    value === 'notification.new' ||
    value === 'notification.updated' ||
    value === 'notification.deleted' ||
    value === 'notification.all_read' ||
    value === 'follow.request.created' ||
    value === 'follow.request.updated' ||
    value === 'event.rsvp.updated'
  );
};

export const parseNotificationRealtimeEvent = (
  data: string,
): { payload: unknown; type: NotificationRealtimeEventType } | null => {
  let parsed: RealtimeEnvelope;

  try {
    parsed = JSON.parse(data) as RealtimeEnvelope;
  } catch {
    return null;
  }

  if (!isNotificationRealtimeEventType(parsed.type)) {
    return null;
  }

  return {
    payload: parsed.payload,
    type: parsed.type,
  };
};
