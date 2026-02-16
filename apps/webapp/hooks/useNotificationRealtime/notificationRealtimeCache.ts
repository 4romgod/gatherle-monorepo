import type { ApolloClient } from '@apollo/client';
import {
  GetEventParticipantsDocument,
  GetFollowRequestsDocument,
  GetFollowingDocument,
  GetMyRsvpStatusDocument,
  GetMyRsvpsDocument,
  GetNotificationsDocument,
  GetUnreadNotificationCountDocument,
} from '@/data/graphql/query';
import { FollowApprovalStatus, FollowTargetType, ParticipantStatus } from '@/data/graphql/types/graphql';
import { isRecord } from '@/lib/utils';
import {
  normalizeEventParticipantForEventParticipantsCache,
  normalizeEventParticipantForEventQueryCache,
  normalizeEventParticipantForMyRsvpStatusCache,
  normalizeEventParticipantForMyRsvpsCache,
  normalizeFollowRequestForCache,
  normalizeNotificationForCache,
  type EventQueryParticipantCacheItem,
  type RealtimeEventRsvpPayload,
  type RealtimeFollowRequestPayload,
  type RealtimeNotificationPayload,
} from './notificationRealtimeProtocol';

const DEFAULT_NOTIFICATION_PAGE_LIMIT = 20;

interface CreateNotificationRealtimeCacheHandlersParams {
  client: ApolloClient<object>;
  userId: string;
}

export const createNotificationRealtimeCacheHandlers = ({
  client,
  userId,
}: CreateNotificationRealtimeCacheHandlersParams) => {
  const upsertFollowRequestCache = (followRequest: ReturnType<typeof normalizeFollowRequestForCache>) => {
    if (followRequest.targetType !== FollowTargetType.User || followRequest.targetId !== userId) {
      return;
    }

    client.cache.updateQuery(
      {
        query: GetFollowRequestsDocument,
        variables: { targetType: FollowTargetType.User },
      },
      (existing) => {
        if (!existing?.readFollowRequests) {
          return existing;
        }

        const currentItems = existing.readFollowRequests;
        const existingIndex = currentItems.findIndex((item) => item.followId === followRequest.followId);

        let nextItems: typeof currentItems;
        if (existingIndex === -1) {
          nextItems = [followRequest, ...currentItems];
        } else {
          nextItems = currentItems.map((item, index) => (index === existingIndex ? followRequest : item));
        }

        nextItems = [...nextItems].sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        );

        return {
          ...existing,
          readFollowRequests: nextItems,
        };
      },
    );
  };

  const updateFollowingCacheForAcceptedFollow = (targetUserId: string) => {
    client.cache.updateQuery(
      {
        query: GetFollowingDocument,
      },
      (existing) => {
        if (!existing?.readFollowing) {
          return existing;
        }

        return {
          ...existing,
          readFollowing: existing.readFollowing.map((follow) => {
            if (
              follow.targetType === FollowTargetType.User &&
              follow.targetId === targetUserId &&
              follow.approvalStatus === FollowApprovalStatus.Pending
            ) {
              return {
                ...follow,
                approvalStatus: FollowApprovalStatus.Accepted,
              };
            }

            return follow;
          }),
        };
      },
    );
  };

  const updateFollowingCacheForFollowRequest = (followRequest: ReturnType<typeof normalizeFollowRequestForCache>) => {
    if (followRequest.followerUserId !== userId) {
      return;
    }

    let matchedFollow = false;

    client.cache.updateQuery(
      {
        query: GetFollowingDocument,
      },
      (existing) => {
        if (!existing?.readFollowing) {
          return existing;
        }

        const nextFollowing = existing.readFollowing.map((follow) => {
          const isMatchingFollow =
            follow.followId === followRequest.followId ||
            (follow.followerUserId === followRequest.followerUserId &&
              follow.targetType === followRequest.targetType &&
              follow.targetId === followRequest.targetId);

          if (!isMatchingFollow) {
            return follow;
          }

          matchedFollow = true;
          return {
            ...follow,
            approvalStatus: followRequest.approvalStatus,
          };
        });

        return matchedFollow
          ? {
              ...existing,
              readFollowing: nextFollowing,
            }
          : existing;
      },
    );

    if (!matchedFollow) {
      void client.refetchQueries({
        include: [GetFollowingDocument],
      });
    }
  };

  const upsertEventParticipantsCache = (payload: RealtimeEventRsvpPayload) => {
    const normalizedParticipant = normalizeEventParticipantForEventParticipantsCache(payload.participant);

    client.cache.updateQuery(
      {
        query: GetEventParticipantsDocument,
        variables: { eventId: payload.participant.eventId },
      },
      (existing) => {
        if (!existing?.readEventParticipants) {
          return existing;
        }

        const currentItems = existing.readEventParticipants;
        const existingIndex = currentItems.findIndex(
          (item) => item.participantId === normalizedParticipant.participantId,
        );

        let nextItems: typeof currentItems;
        if (existingIndex === -1) {
          nextItems = [normalizedParticipant as (typeof currentItems)[number], ...currentItems];
        } else {
          nextItems = currentItems.map((item, index) =>
            index === existingIndex
              ? ({
                  ...item,
                  ...normalizedParticipant,
                } as (typeof currentItems)[number])
              : item,
          );
        }

        return {
          ...existing,
          readEventParticipants: nextItems,
        };
      },
    );
  };

  const upsertMyRsvpCaches = (payload: RealtimeEventRsvpPayload) => {
    if (payload.participant.userId !== userId) {
      return;
    }

    const normalizedMyRsvpStatus = normalizeEventParticipantForMyRsvpStatusCache(payload.participant);
    let shouldRefetchMyRsvps = false;

    client.cache.updateQuery(
      {
        query: GetMyRsvpStatusDocument,
        variables: { eventId: payload.participant.eventId },
      },
      (existing) => {
        if (!existing || !('myRsvpStatus' in existing)) {
          return existing;
        }

        return {
          ...existing,
          myRsvpStatus: normalizedMyRsvpStatus,
        };
      },
    );

    const updateMyRsvpsListCache = (includeCancelled: boolean) => {
      client.cache.updateQuery(
        {
          query: GetMyRsvpsDocument,
          variables: { includeCancelled },
        },
        (existing) => {
          if (!existing?.myRsvps) {
            shouldRefetchMyRsvps = true;
            return existing;
          }

          const currentItems = existing.myRsvps;
          const existingIndex = currentItems.findIndex(
            (item) => item.participantId === payload.participant.participantId,
          );

          const shouldRemove = !includeCancelled && payload.participant.status === ParticipantStatus.Cancelled;

          let nextItems = currentItems;
          if (shouldRemove) {
            nextItems = currentItems.filter((item) => item.participantId !== payload.participant.participantId);
          } else {
            const normalizedParticipant = normalizeEventParticipantForMyRsvpsCache(
              payload.participant,
              existingIndex >= 0 ? currentItems[existingIndex] : undefined,
            );

            if (existingIndex === -1) {
              if (!normalizedParticipant.event) {
                shouldRefetchMyRsvps = true;
                return existing;
              }
              nextItems = [normalizedParticipant as (typeof currentItems)[number], ...currentItems];
            } else {
              nextItems = currentItems.map((item, index) =>
                index === existingIndex
                  ? ({
                      ...item,
                      ...normalizedParticipant,
                    } as (typeof currentItems)[number])
                  : item,
              );
            }
          }

          return {
            ...existing,
            myRsvps: nextItems,
          };
        },
      );
    };

    updateMyRsvpsListCache(false);
    updateMyRsvpsListCache(true);

    if (shouldRefetchMyRsvps && payload.participant.status !== ParticipantStatus.Cancelled) {
      void client.refetchQueries({
        include: [GetMyRsvpsDocument],
      });
    }
  };

  const upsertEventQueryCaches = (payload: RealtimeEventRsvpPayload) => {
    client.cache.modify({
      id: 'ROOT_QUERY',
      fields: {
        readEventBySlug(existing: unknown) {
          if (!isRecord(existing) || existing.eventId !== payload.participant.eventId) {
            return existing;
          }

          const currentParticipants = Array.isArray(existing.participants)
            ? (existing.participants as EventQueryParticipantCacheItem[])
            : [];
          const existingParticipant = currentParticipants.find(
            (participant) => participant.participantId === payload.participant.participantId,
          );
          const normalizedParticipant = normalizeEventParticipantForEventQueryCache(
            payload.participant,
            existingParticipant,
          );
          const existingIndex = currentParticipants.findIndex(
            (participant) => participant.participantId === payload.participant.participantId,
          );

          let nextParticipants: EventQueryParticipantCacheItem[];
          if (existingIndex === -1) {
            nextParticipants = [normalizedParticipant, ...currentParticipants];
          } else {
            nextParticipants = currentParticipants.map((participant, index) =>
              index === existingIndex ? { ...participant, ...normalizedParticipant } : participant,
            );
          }

          const nextMyRsvp =
            payload.participant.userId === userId
              ? {
                  __typename: 'EventParticipant',
                  participantId: payload.participant.participantId,
                  status: payload.participant.status,
                  quantity: payload.participant.quantity ?? null,
                }
              : existing.myRsvp;

          return {
            ...existing,
            participants: nextParticipants,
            rsvpCount: payload.rsvpCount,
            myRsvp: nextMyRsvp,
          };
        },

        readEvents(existing: unknown) {
          if (!Array.isArray(existing)) {
            return existing;
          }

          return existing.map((eventItem) => {
            if (!isRecord(eventItem) || eventItem.eventId !== payload.participant.eventId) {
              return eventItem;
            }

            const currentParticipants = Array.isArray(eventItem.participants)
              ? (eventItem.participants as EventQueryParticipantCacheItem[])
              : [];
            const existingParticipant = currentParticipants.find(
              (participant) => participant.participantId === payload.participant.participantId,
            );
            const normalizedParticipant = normalizeEventParticipantForEventQueryCache(
              payload.participant,
              existingParticipant,
            );
            const existingIndex = currentParticipants.findIndex(
              (participant) => participant.participantId === payload.participant.participantId,
            );

            let nextParticipants: EventQueryParticipantCacheItem[];
            if (existingIndex === -1) {
              nextParticipants = [normalizedParticipant, ...currentParticipants];
            } else {
              nextParticipants = currentParticipants.map((participant, index) =>
                index === existingIndex ? { ...participant, ...normalizedParticipant } : participant,
              );
            }

            const nextMyRsvp =
              payload.participant.userId === userId
                ? {
                    __typename: 'EventParticipant',
                    participantId: payload.participant.participantId,
                    status: payload.participant.status,
                    quantity: payload.participant.quantity ?? null,
                  }
                : eventItem.myRsvp;

            return {
              ...eventItem,
              participants: nextParticipants,
              rsvpCount: payload.rsvpCount,
              myRsvp: nextMyRsvp,
            };
          });
        },
      },
    });
  };

  const handleRealtimeNotification = (payload: RealtimeNotificationPayload) => {
    const { notification, unreadCount } = payload;
    const normalizedNotification = normalizeNotificationForCache(notification);

    client.writeQuery({
      query: GetUnreadNotificationCountDocument,
      data: {
        unreadNotificationCount: unreadCount,
      },
    });

    const updateNotificationListCache = (unreadOnly: boolean) => {
      client.cache.updateQuery(
        {
          query: GetNotificationsDocument,
          variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT, unreadOnly },
        },
        (existing) => {
          if (!existing?.notifications) {
            return existing;
          }

          const currentItems = existing.notifications.notifications;
          const alreadyExists = currentItems.some(
            (item) => item.notificationId === normalizedNotification.notificationId,
          );

          let nextItems = currentItems;
          if (!alreadyExists && (!unreadOnly || normalizedNotification.isRead === false)) {
            const maxItems = Math.max(currentItems.length, DEFAULT_NOTIFICATION_PAGE_LIMIT);
            nextItems = [normalizedNotification as (typeof currentItems)[number], ...currentItems].slice(0, maxItems);
          }

          return {
            ...existing,
            notifications: {
              ...existing.notifications,
              unreadCount,
              notifications: nextItems,
            },
          };
        },
      );
    };

    updateNotificationListCache(false);
    updateNotificationListCache(true);

    if (normalizedNotification.type === 'FOLLOW_ACCEPTED' && typeof normalizedNotification.actorUserId === 'string') {
      updateFollowingCacheForAcceptedFollow(normalizedNotification.actorUserId);
    }
  };

  const handleRealtimeFollowRequest = (payload: RealtimeFollowRequestPayload) => {
    const normalizedFollowRequest = normalizeFollowRequestForCache(payload.follow);
    upsertFollowRequestCache(normalizedFollowRequest);
    updateFollowingCacheForFollowRequest(normalizedFollowRequest);
  };

  const handleRealtimeEventRsvp = (payload: RealtimeEventRsvpPayload) => {
    upsertEventParticipantsCache(payload);
    upsertMyRsvpCaches(payload);
    upsertEventQueryCaches(payload);
  };

  return {
    handleRealtimeNotification,
    handleRealtimeFollowRequest,
    handleRealtimeEventRsvp,
  };
};
