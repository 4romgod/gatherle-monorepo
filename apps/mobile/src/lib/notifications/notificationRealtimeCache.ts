import type { ApolloClient } from '@apollo/client';
import {
  GetMyEventOccurrenceRsvpStatusDocument,
  GetMyEventOccurrenceRsvpsDocument,
} from '@data/graphql/query/EventOccurrenceParticipant/query';
import { GetPendingFollowRequestsDocument } from '@data/graphql/query/Follow/query';
import { GetNotificationsDocument, GetUnreadNotificationCountDocument } from '@data/graphql/query/Notification/query';
import { FollowApprovalStatus, FollowTargetType } from '@data/graphql/types/graphql';
import type {
  MobileRealtimeEventRsvpPayload,
  MobileRealtimeFollowRequestPayload,
  MobileRealtimeNotificationDeletedPayload,
  MobileRealtimeNotificationPayload,
  MobileRealtimeNotificationsAllReadPayload,
} from './notificationRealtimeProtocol';

const DEFAULT_NOTIFICATION_PAGE_LIMIT = 24;

interface CreateMobileNotificationRealtimeCacheHandlersParams {
  client: ApolloClient<object>;
  userId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeMobileOccurrenceParticipant(
  participant: MobileRealtimeEventRsvpPayload['participant'],
  existingUser?: Record<string, unknown> | null,
) {
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
      defaultVisibility:
        existingUser && typeof existingUser.defaultVisibility !== 'undefined' ? existingUser.defaultVisibility : null,
    },
  };
}

function updateOccurrenceCollection(occurrences: unknown[], payload: MobileRealtimeEventRsvpPayload, userId: string) {
  return occurrences.map((occurrence) => {
    if (!isRecord(occurrence) || occurrence.occurrenceId !== payload.participant.occurrenceId) {
      return occurrence;
    }

    const currentParticipants = Array.isArray(occurrence.participants)
      ? (occurrence.participants as Record<string, unknown>[])
      : [];
    const existingParticipantIndex = currentParticipants.findIndex(
      (item) => isRecord(item) && item.participantId === payload.participant.participantId,
    );
    const existingParticipant =
      existingParticipantIndex >= 0 && isRecord(currentParticipants[existingParticipantIndex])
        ? currentParticipants[existingParticipantIndex]
        : null;
    const normalizedParticipant = normalizeMobileOccurrenceParticipant(
      payload.participant,
      isRecord(existingParticipant?.user) ? (existingParticipant.user as Record<string, unknown>) : null,
    );

    const nextParticipants =
      existingParticipantIndex >= 0
        ? currentParticipants.map((participantItem, index) =>
            index === existingParticipantIndex
              ? ({
                  ...participantItem,
                  ...normalizedParticipant,
                } as (typeof currentParticipants)[number])
              : participantItem,
          )
        : [normalizedParticipant, ...currentParticipants];

    const nextMyRsvp =
      payload.participant.userId === userId
        ? {
            __typename: 'EventOccurrenceParticipant',
            participantId: payload.participant.participantId,
            occurrenceId: payload.participant.occurrenceId ?? '',
            status: payload.participant.status,
            quantity: payload.participant.quantity ?? null,
          }
        : occurrence.myRsvp;

    return {
      ...occurrence,
      participants: nextParticipants,
      rsvpCount: payload.rsvpCount,
      myRsvp: nextMyRsvp,
    };
  });
}

export const createMobileNotificationRealtimeCacheHandlers = ({
  client,
  userId,
}: CreateMobileNotificationRealtimeCacheHandlersParams) => {
  const writeUnreadNotificationCount = (unreadCount: number) => {
    client.writeQuery({
      query: GetUnreadNotificationCountDocument,
      data: {
        unreadNotificationCount: unreadCount,
      },
    });
  };

  const handleRealtimeNotification = (payload: MobileRealtimeNotificationPayload) => {
    writeUnreadNotificationCount(payload.unreadCount);

    client.cache.updateQuery(
      {
        query: GetNotificationsDocument,
        variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT },
      },
      (existing) => {
        if (!existing?.notifications) {
          return existing;
        }

        const currentItems = existing.notifications.notifications;
        const existingIndex = currentItems.findIndex(
          (item) => item.notificationId === payload.notification.notificationId,
        );
        const maxItems = Math.max(currentItems.length, DEFAULT_NOTIFICATION_PAGE_LIMIT);

        const nextItems =
          existingIndex >= 0
            ? currentItems.map((item, index) =>
                index === existingIndex
                  ? ({
                      ...item,
                      ...payload.notification,
                    } as (typeof currentItems)[number])
                  : item,
              )
            : [payload.notification as (typeof currentItems)[number], ...currentItems].slice(0, maxItems);

        return {
          ...existing,
          notifications: {
            ...existing.notifications,
            unreadCount: payload.unreadCount,
            notifications: nextItems,
          },
        };
      },
    );
  };

  const handleRealtimeNotificationDeleted = (payload: MobileRealtimeNotificationDeletedPayload) => {
    writeUnreadNotificationCount(payload.unreadCount);

    client.cache.updateQuery(
      {
        query: GetNotificationsDocument,
        variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT },
      },
      (existing) => {
        if (!existing?.notifications) {
          return existing;
        }

        return {
          ...existing,
          notifications: {
            ...existing.notifications,
            unreadCount: payload.unreadCount,
            notifications: existing.notifications.notifications.filter(
              (item) => item.notificationId !== payload.notificationId,
            ),
          },
        };
      },
    );
  };

  const handleRealtimeNotificationsAllRead = (payload: MobileRealtimeNotificationsAllReadPayload) => {
    writeUnreadNotificationCount(payload.unreadCount);

    client.cache.updateQuery(
      {
        query: GetNotificationsDocument,
        variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT },
      },
      (existing) => {
        if (!existing?.notifications) {
          return existing;
        }

        return {
          ...existing,
          notifications: {
            ...existing.notifications,
            unreadCount: payload.unreadCount,
            notifications: existing.notifications.notifications.map((item) => ({
              ...item,
              isRead: true,
              readAt: item.readAt ?? payload.readAt,
            })),
          },
        };
      },
    );
  };

  const handleRealtimeFollowRequest = (payload: MobileRealtimeFollowRequestPayload) => {
    if (payload.follow.targetType !== FollowTargetType.User || payload.follow.targetId !== userId) {
      return;
    }

    client.cache.updateQuery(
      {
        query: GetPendingFollowRequestsDocument,
        variables: { targetType: FollowTargetType.User },
      },
      (existing) => {
        if (!existing?.readPendingFollowRequests) {
          return existing;
        }

        const currentItems = existing.readPendingFollowRequests;
        const existingIndex = currentItems.findIndex((item) => item.followId === payload.follow.followId);
        const isStillPending = payload.follow.approvalStatus === FollowApprovalStatus.Pending;

        let nextItems = currentItems;
        if (existingIndex >= 0) {
          nextItems = isStillPending
            ? currentItems.map((item, index) =>
                index === existingIndex
                  ? ({
                      ...item,
                      ...payload.follow,
                    } as (typeof currentItems)[number])
                  : item,
              )
            : currentItems.filter((item) => item.followId !== payload.follow.followId);
        } else if (isStillPending) {
          nextItems = [payload.follow as (typeof currentItems)[number], ...currentItems];
        }

        nextItems = [...nextItems].sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        );

        return {
          ...existing,
          readPendingFollowRequests: nextItems,
        };
      },
    );
  };

  const handleRealtimeEventRsvp = (payload: MobileRealtimeEventRsvpPayload) => {
    const occurrenceId = payload.participant.occurrenceId;
    if (!occurrenceId) {
      return;
    }

    if (payload.participant.userId === userId) {
      client.cache.updateQuery(
        {
          query: GetMyEventOccurrenceRsvpStatusDocument,
          variables: { occurrenceId },
        },
        (existing) => {
          if (!existing || !('myEventOccurrenceRsvpStatus' in existing)) {
            return existing;
          }

          return {
            ...existing,
            myEventOccurrenceRsvpStatus: {
              __typename: 'EventOccurrenceParticipant' as const,
              participantId: payload.participant.participantId,
              occurrenceId,
              userId: payload.participant.userId,
              status: payload.participant.status,
              quantity: payload.participant.quantity ?? null,
              sharedVisibility: payload.participant.sharedVisibility ?? null,
              rsvpAt: payload.participant.rsvpAt ?? null,
              cancelledAt: payload.participant.cancelledAt ?? null,
            },
          };
        },
      );

      void client.refetchQueries({
        include: [GetMyEventOccurrenceRsvpsDocument],
      });
    }

    client.cache.modify({
      id: 'ROOT_QUERY',
      fields: {
        readEventOccurrences(existing: unknown) {
          return Array.isArray(existing) ? updateOccurrenceCollection(existing, payload, userId) : existing;
        },
        upcoming(existing: unknown) {
          return Array.isArray(existing) ? updateOccurrenceCollection(existing, payload, userId) : existing;
        },
        trending(existing: unknown) {
          return Array.isArray(existing) ? updateOccurrenceCollection(existing, payload, userId) : existing;
        },
        readUserEventOccurrences(existing: unknown) {
          return Array.isArray(existing) ? updateOccurrenceCollection(existing, payload, userId) : existing;
        },
      },
    });
  };

  return {
    handleRealtimeEventRsvp,
    handleRealtimeNotification,
    handleRealtimeNotificationDeleted,
    handleRealtimeNotificationsAllRead,
    handleRealtimeFollowRequest,
  };
};
