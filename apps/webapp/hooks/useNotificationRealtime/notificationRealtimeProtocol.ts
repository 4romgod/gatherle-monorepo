import type { Notification } from '@/data/graphql/query/Notification/types';
import type {
  GetEventParticipantsQuery,
  GetFollowRequestsQuery,
  GetMyRsvpStatusQuery,
  GetMyRsvpsQuery,
} from '@/data/graphql/types/graphql';
import {
  FollowApprovalStatus,
  FollowTargetType,
  ParticipantStatus,
  ParticipantVisibility,
} from '@/data/graphql/types/graphql';
import { isRecord } from '@/lib/utils';

const FOLLOW_APPROVAL_STATUSES = new Set<FollowApprovalStatus>(Object.values(FollowApprovalStatus));
const FOLLOW_TARGET_TYPES = new Set<FollowTargetType>(Object.values(FollowTargetType));
const PARTICIPANT_STATUSES = new Set<ParticipantStatus>(Object.values(ParticipantStatus));
const PARTICIPANT_VISIBILITIES = new Set<ParticipantVisibility>(Object.values(ParticipantVisibility));

export type RealtimeEnvelope = {
  type?: unknown;
  payload?: unknown;
};

export type RealtimeNotificationPayload = {
  notification: Notification;
  unreadCount: number;
};

export type FollowRequestCacheItem = GetFollowRequestsQuery['readFollowRequests'][number];
export type EventParticipantsCacheItem = GetEventParticipantsQuery['readEventParticipants'][number];
export type MyRsvpStatusCacheItem = NonNullable<GetMyRsvpStatusQuery['myRsvpStatus']>;
export type MyRsvpsCacheItem = GetMyRsvpsQuery['myRsvps'][number];
export type EventQueryParticipantCacheItem = {
  __typename?: string;
  participantId: string;
  eventId: string;
  userId: string;
  status: ParticipantStatus;
  quantity?: number | null;
  sharedVisibility?: ParticipantVisibility | null;
  user?: {
    __typename?: string;
    userId: string;
    username: string;
    given_name: string;
    family_name: string;
    profile_picture?: string | null;
    defaultVisibility?: unknown;
  } | null;
};

export type RealtimeFollowRequestPayload = {
  follow: {
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
  };
};

export type RealtimeEventRsvpPayload = {
  participant: {
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
  };
  previousStatus: ParticipantStatus | null;
  rsvpCount: number;
};

export const parseRealtimeEnvelope = (data: string): RealtimeEnvelope | null => {
  try {
    return JSON.parse(data) as RealtimeEnvelope;
  } catch {
    return null;
  }
};

export const isRealtimeNotificationPayload = (value: unknown): value is RealtimeNotificationPayload => {
  if (!isRecord(value)) {
    return false;
  }

  const notification = value.notification;
  const unreadCount = value.unreadCount;

  if (!isRecord(notification) || typeof unreadCount !== 'number') {
    return false;
  }

  return (
    typeof notification.notificationId === 'string' &&
    typeof notification.recipientUserId === 'string' &&
    typeof notification.type === 'string' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string' &&
    typeof notification.isRead === 'boolean' &&
    typeof notification.createdAt === 'string'
  );
};

export const isRealtimeFollowRequestPayload = (value: unknown): value is RealtimeFollowRequestPayload => {
  if (!isRecord(value) || !isRecord(value.follow)) {
    return false;
  }

  const follow = value.follow;

  if (
    typeof follow.followId !== 'string' ||
    typeof follow.followerUserId !== 'string' ||
    !FOLLOW_TARGET_TYPES.has(follow.targetType as FollowTargetType) ||
    typeof follow.targetId !== 'string' ||
    !FOLLOW_APPROVAL_STATUSES.has(follow.approvalStatus as FollowApprovalStatus) ||
    typeof follow.createdAt !== 'string' ||
    typeof follow.updatedAt !== 'string' ||
    !isRecord(follow.follower)
  ) {
    return false;
  }

  const follower = follow.follower;
  return (
    typeof follower.userId === 'string' &&
    typeof follower.username === 'string' &&
    typeof follower.email === 'string' &&
    typeof follower.given_name === 'string' &&
    typeof follower.family_name === 'string' &&
    (typeof follower.profile_picture === 'string' ||
      follower.profile_picture === null ||
      follower.profile_picture === undefined) &&
    (typeof follower.bio === 'string' || follower.bio === null || follower.bio === undefined)
  );
};

export const isRealtimeEventRsvpPayload = (value: unknown): value is RealtimeEventRsvpPayload => {
  if (!isRecord(value) || !isRecord(value.participant) || typeof value.rsvpCount !== 'number') {
    return false;
  }

  const participant = value.participant;
  const previousStatus = value.previousStatus;

  if (
    typeof participant.participantId !== 'string' ||
    typeof participant.eventId !== 'string' ||
    typeof participant.userId !== 'string' ||
    !PARTICIPANT_STATUSES.has(participant.status as ParticipantStatus) ||
    (participant.quantity !== undefined && participant.quantity !== null && typeof participant.quantity !== 'number') ||
    (participant.sharedVisibility !== undefined &&
      participant.sharedVisibility !== null &&
      !PARTICIPANT_VISIBILITIES.has(participant.sharedVisibility as ParticipantVisibility)) ||
    (participant.rsvpAt !== undefined && participant.rsvpAt !== null && typeof participant.rsvpAt !== 'string') ||
    (participant.cancelledAt !== undefined &&
      participant.cancelledAt !== null &&
      typeof participant.cancelledAt !== 'string') ||
    (participant.checkedInAt !== undefined &&
      participant.checkedInAt !== null &&
      typeof participant.checkedInAt !== 'string') ||
    !isRecord(participant.user) ||
    (previousStatus !== null && !PARTICIPANT_STATUSES.has(previousStatus as ParticipantStatus))
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

export const normalizeNotificationForCache = (
  notification: RealtimeNotificationPayload['notification'],
): Notification => {
  const actor = notification.actor;
  const hasCompleteActor =
    isRecord(actor) &&
    typeof actor.userId === 'string' &&
    typeof actor.username === 'string' &&
    typeof actor.given_name === 'string' &&
    typeof actor.family_name === 'string';

  return {
    __typename: notification.__typename ?? 'Notification',
    notificationId: notification.notificationId,
    recipientUserId: notification.recipientUserId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actorUserId: notification.actorUserId ?? null,
    actor: hasCompleteActor
      ? {
          __typename: actor.__typename ?? 'User',
          userId: actor.userId,
          username: actor.username,
          given_name: actor.given_name,
          family_name: actor.family_name,
          profile_picture: typeof actor.profile_picture === 'string' ? actor.profile_picture : null,
        }
      : null,
    targetType: notification.targetType ?? null,
    targetId: notification.targetId ?? null,
    isRead: notification.isRead,
    readAt: notification.readAt ?? null,
    actionUrl: notification.actionUrl ?? null,
    createdAt: notification.createdAt,
  };
};

export const normalizeFollowRequestForCache = (
  follow: RealtimeFollowRequestPayload['follow'],
): FollowRequestCacheItem => {
  return {
    __typename: 'Follow',
    followId: follow.followId,
    followerUserId: follow.followerUserId,
    targetType: follow.targetType,
    targetId: follow.targetId,
    approvalStatus: follow.approvalStatus,
    createdAt: follow.createdAt,
    updatedAt: follow.updatedAt,
    follower: {
      __typename: 'User',
      userId: follow.follower.userId,
      username: follow.follower.username,
      email: follow.follower.email,
      given_name: follow.follower.given_name,
      family_name: follow.follower.family_name,
      profile_picture: follow.follower.profile_picture ?? null,
      bio: follow.follower.bio ?? null,
    },
  };
};

export const normalizeEventParticipantForEventParticipantsCache = (
  participant: RealtimeEventRsvpPayload['participant'],
): EventParticipantsCacheItem => {
  return {
    __typename: 'EventParticipant',
    participantId: participant.participantId,
    eventId: participant.eventId,
    userId: participant.userId,
    status: participant.status,
    quantity: participant.quantity ?? null,
    sharedVisibility: participant.sharedVisibility ?? null,
    rsvpAt: participant.rsvpAt ?? null,
    user: {
      __typename: 'User',
      userId: participant.user.userId,
      username: participant.user.username,
      given_name: participant.user.given_name,
      family_name: participant.user.family_name,
      profile_picture: participant.user.profile_picture ?? null,
    },
  };
};

export const normalizeEventParticipantForMyRsvpStatusCache = (
  participant: RealtimeEventRsvpPayload['participant'],
): MyRsvpStatusCacheItem => {
  return {
    __typename: 'EventParticipant',
    participantId: participant.participantId,
    eventId: participant.eventId,
    userId: participant.userId,
    status: participant.status,
    quantity: participant.quantity ?? null,
    sharedVisibility: participant.sharedVisibility ?? null,
    rsvpAt: participant.rsvpAt ?? null,
    cancelledAt: participant.cancelledAt ?? null,
  };
};

export const normalizeEventParticipantForMyRsvpsCache = (
  participant: RealtimeEventRsvpPayload['participant'],
  existingParticipant?: MyRsvpsCacheItem,
): MyRsvpsCacheItem => {
  return {
    __typename: 'EventParticipant',
    participantId: participant.participantId,
    eventId: participant.eventId,
    userId: participant.userId,
    status: participant.status,
    quantity: participant.quantity ?? null,
    sharedVisibility: participant.sharedVisibility ?? null,
    rsvpAt: participant.rsvpAt ?? null,
    cancelledAt: participant.cancelledAt ?? null,
    user: {
      __typename: 'User',
      userId: participant.user.userId,
      username: participant.user.username,
      given_name: participant.user.given_name,
      family_name: participant.user.family_name,
      profile_picture: participant.user.profile_picture ?? null,
    },
    event: existingParticipant?.event ?? null,
  };
};

export const normalizeEventParticipantForEventQueryCache = (
  participant: RealtimeEventRsvpPayload['participant'],
  existingParticipant?: EventQueryParticipantCacheItem,
): EventQueryParticipantCacheItem => {
  return {
    __typename: 'EventParticipant',
    participantId: participant.participantId,
    eventId: participant.eventId,
    userId: participant.userId,
    status: participant.status,
    quantity: participant.quantity ?? null,
    sharedVisibility: participant.sharedVisibility ?? null,
    user: {
      __typename: 'User',
      userId: participant.user.userId,
      username: participant.user.username,
      given_name: participant.user.given_name,
      family_name: participant.user.family_name,
      profile_picture: participant.user.profile_picture ?? null,
      defaultVisibility: existingParticipant?.user?.defaultVisibility ?? null,
    },
  };
};
