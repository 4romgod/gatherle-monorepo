import type { Notification } from '@/data/graphql/query/Notification/types';
import type {
  GetEventOccurrenceParticipantsQuery,
  GetEventParticipantsQuery,
  GetMyEventOccurrenceRsvpStatusQuery,
  GetMyEventOccurrenceRsvpsQuery,
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

export type RealtimeNotificationDeletedPayload = {
  notificationId: string;
  unreadCount: number;
};

export type RealtimeNotificationsAllReadPayload = {
  unreadCount: number;
  readAt: string;
};

export type FollowRequestCacheItem = GetFollowRequestsQuery['readFollowRequests'][number];
export type EventOccurrenceParticipantsCacheItem =
  GetEventOccurrenceParticipantsQuery['readEventOccurrenceParticipants'][number];
export type EventParticipantsCacheItem = GetEventParticipantsQuery['readEventParticipants'][number];
export type MyEventOccurrenceRsvpStatusCacheItem = NonNullable<
  GetMyEventOccurrenceRsvpStatusQuery['myEventOccurrenceRsvpStatus']
>;
export type MyEventOccurrenceRsvpsCacheItem = GetMyEventOccurrenceRsvpsQuery['myEventOccurrenceRsvps'][number];
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

export type RealtimeEventSavePayload = {
  eventId: string;
  isSaved: boolean;
  followId?: string | null;
};

export type RealtimeMomentCreatedPayload = {
  moment: {
    momentId: string;
    eventId: string;
    occurrenceId?: string | null;
    authorId: string;
    type: string;
    state: string;
    caption?: string | null;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
    imageDisplayMode?: string | null;
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
  };
};

export type RealtimeMomentDeletedPayload = {
  momentId: string;
  eventId: string;
  occurrenceId?: string | null;
  authorId: string;
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

export const isRealtimeNotificationDeletedPayload = (value: unknown): value is RealtimeNotificationDeletedPayload => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.notificationId === 'string' && typeof value.unreadCount === 'number';
};

export const isRealtimeNotificationsAllReadPayload = (value: unknown): value is RealtimeNotificationsAllReadPayload => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.unreadCount === 'number' && typeof value.readAt === 'string';
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
    (participant.occurrenceId !== undefined &&
      participant.occurrenceId !== null &&
      typeof participant.occurrenceId !== 'string') ||
    (participant.occurrenceKey !== undefined &&
      participant.occurrenceKey !== null &&
      typeof participant.occurrenceKey !== 'string') ||
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

export const isRealtimeEventSavePayload = (value: unknown): value is RealtimeEventSavePayload => {
  return (
    isRecord(value) &&
    typeof value.eventId === 'string' &&
    typeof value.isSaved === 'boolean' &&
    (typeof value.followId === 'string' || value.followId === null || value.followId === undefined)
  );
};

export const isRealtimeMomentCreatedPayload = (value: unknown): value is RealtimeMomentCreatedPayload => {
  return (
    isRecord(value) &&
    isRecord(value.moment) &&
    typeof value.moment.momentId === 'string' &&
    typeof value.moment.eventId === 'string' &&
    (typeof value.moment.occurrenceId === 'string' ||
      value.moment.occurrenceId === null ||
      value.moment.occurrenceId === undefined) &&
    typeof value.moment.authorId === 'string' &&
    typeof value.moment.type === 'string' &&
    typeof value.moment.state === 'string' &&
    (typeof value.moment.caption === 'string' || value.moment.caption === null || value.moment.caption === undefined) &&
    (typeof value.moment.mediaUrl === 'string' ||
      value.moment.mediaUrl === null ||
      value.moment.mediaUrl === undefined) &&
    (typeof value.moment.thumbnailUrl === 'string' ||
      value.moment.thumbnailUrl === null ||
      value.moment.thumbnailUrl === undefined) &&
    (typeof value.moment.imageDisplayMode === 'string' ||
      value.moment.imageDisplayMode === null ||
      value.moment.imageDisplayMode === undefined) &&
    (typeof value.moment.background === 'string' ||
      value.moment.background === null ||
      value.moment.background === undefined) &&
    (typeof value.moment.durationSeconds === 'number' ||
      value.moment.durationSeconds === null ||
      value.moment.durationSeconds === undefined) &&
    typeof value.moment.expiresAt === 'string' &&
    typeof value.moment.createdAt === 'string' &&
    isRecord(value.moment.author) &&
    typeof value.moment.author.userId === 'string' &&
    typeof value.moment.author.username === 'string' &&
    typeof value.moment.author.given_name === 'string' &&
    typeof value.moment.author.family_name === 'string' &&
    (typeof value.moment.author.profile_picture === 'string' ||
      value.moment.author.profile_picture === null ||
      value.moment.author.profile_picture === undefined) &&
    isRecord(value.moment.event) &&
    typeof value.moment.event.eventId === 'string' &&
    typeof value.moment.event.slug === 'string' &&
    typeof value.moment.event.title === 'string'
  );
};

export const isRealtimeMomentDeletedPayload = (value: unknown): value is RealtimeMomentDeletedPayload => {
  return (
    isRecord(value) &&
    typeof value.momentId === 'string' &&
    typeof value.eventId === 'string' &&
    typeof value.authorId === 'string' &&
    (typeof value.occurrenceId === 'string' || value.occurrenceId === null || value.occurrenceId === undefined)
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
    __typename: 'EventSeriesParticipant',
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

export const normalizeEventParticipantForOccurrenceParticipantsCache = (
  participant: RealtimeEventRsvpPayload['participant'],
): EventOccurrenceParticipantsCacheItem => {
  return {
    __typename: 'EventOccurrenceParticipant',
    participantId: participant.participantId,
    occurrenceId: participant.occurrenceId ?? '',
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
  };
};

export const normalizeEventParticipantForMyRsvpStatusCache = (
  participant: RealtimeEventRsvpPayload['participant'],
): MyRsvpStatusCacheItem => {
  return {
    __typename: 'EventSeriesParticipant',
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

export const normalizeEventParticipantForMyOccurrenceRsvpStatusCache = (
  participant: RealtimeEventRsvpPayload['participant'],
): MyEventOccurrenceRsvpStatusCacheItem => {
  return {
    __typename: 'EventOccurrenceParticipant',
    participantId: participant.participantId,
    occurrenceId: participant.occurrenceId ?? '',
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
    __typename: 'EventSeriesParticipant',
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

export const normalizeEventParticipantForMyOccurrenceRsvpsCache = (
  participant: RealtimeEventRsvpPayload['participant'],
  existingParticipant?: MyEventOccurrenceRsvpsCacheItem,
): MyEventOccurrenceRsvpsCacheItem => {
  return {
    __typename: 'EventOccurrenceParticipant',
    participantId: participant.participantId,
    occurrenceId: participant.occurrenceId ?? '',
    userId: participant.userId,
    status: participant.status,
    quantity: participant.quantity ?? null,
    sharedVisibility: participant.sharedVisibility ?? null,
    rsvpAt: participant.rsvpAt ?? null,
    cancelledAt: participant.cancelledAt ?? null,
    occurrence: existingParticipant?.occurrence ?? null,
  };
};

export const normalizeEventParticipantForEventQueryCache = (
  participant: RealtimeEventRsvpPayload['participant'],
  existingParticipant?: EventQueryParticipantCacheItem,
): EventQueryParticipantCacheItem => {
  return {
    __typename: 'EventSeriesParticipant',
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
