import type { MobileFollowRequest } from '@data/graphql/query/Follow/types';
import type { MobileNotification } from '@data/graphql/query/Notification/types';
import { FollowApprovalStatus, FollowTargetType } from '@data/graphql/types/graphql';

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
  | 'follow.request.updated';

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

const isNotificationRealtimeEventType = (value: unknown): value is NotificationRealtimeEventType => {
  return (
    value === 'notification.new' ||
    value === 'notification.updated' ||
    value === 'notification.deleted' ||
    value === 'notification.all_read' ||
    value === 'follow.request.created' ||
    value === 'follow.request.updated'
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
