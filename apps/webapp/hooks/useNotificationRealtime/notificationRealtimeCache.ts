import { gql, type ApolloClient } from '@apollo/client';
import {
  GetEventOccurrenceParticipantsDocument,
  GetMyEventOccurrenceRsvpStatusDocument,
  GetMyEventOccurrenceRsvpsDocument,
} from '@/data/graphql/query/EventOccurrenceParticipant/query';
import {
  GetEventParticipantsDocument,
  GetFollowRequestsDocument,
  GetFollowingDocument,
  GetMyRsvpStatusDocument,
  GetMyRsvpsDocument,
  GetNotificationsDocument,
  GetSavedEventsDocument,
  GetUnreadNotificationCountDocument,
  IsEventSavedDocument,
} from '@/data/graphql/query';
import { FollowApprovalStatus, FollowTargetType, ParticipantStatus } from '@/data/graphql/types/graphql';
import { isRecord } from '@/lib/utils';
import {
  normalizeEventParticipantForEventParticipantsCache,
  normalizeEventParticipantForOccurrenceParticipantsCache,
  normalizeEventParticipantForEventQueryCache,
  normalizeEventParticipantForMyOccurrenceRsvpStatusCache,
  normalizeEventParticipantForMyRsvpStatusCache,
  normalizeEventParticipantForMyRsvpsCache,
  normalizeFollowRequestForCache,
  normalizeNotificationForCache,
  type EventQueryParticipantCacheItem,
  type RealtimeEventSavePayload,
  type RealtimeEventRsvpPayload,
  type RealtimeFollowRequestPayload,
  type RealtimeMomentCreatedPayload,
  type RealtimeMomentDeletedPayload,
  type RealtimeNotificationDeletedPayload,
  type RealtimeNotificationPayload,
  type RealtimeNotificationsAllReadPayload,
} from './notificationRealtimeProtocol';

const DEFAULT_NOTIFICATION_PAGE_LIMIT = 20;

interface CreateNotificationRealtimeCacheHandlersParams {
  client: ApolloClient<object>;
  userId: string;
}

const EVENT_SERIES_SAVE_STATE_FRAGMENT = gql`
  fragment WebRealtimeEventSeriesSaveState on EventSeries {
    eventId
    isSavedByMe
    savedByCount
  }
`;

const EVENT_MOMENT_CACHE_FRAGMENT = gql`
  fragment WebRealtimeEventMoment on EventMoment {
    momentId
    eventId
    occurrenceId
    authorId
    type
    state
    caption
    mediaUrl
    thumbnailUrl
    imageDisplayMode
    background
    durationSeconds
    expiresAt
    createdAt
    author {
      __typename
      userId
      username
      given_name
      family_name
      profile_picture
    }
    event {
      __typename
      eventId
      slug
      title
    }
  }
`;

function prependMomentRefToPagedList(
  existing: unknown,
  momentRef: unknown,
  readField: (fieldName: string, ref: any) => unknown,
) {
  if (!isRecord(existing) || !Array.isArray(existing.items)) {
    return existing;
  }

  const hasMoment = existing.items.some((item) => readField('momentId', item) === readField('momentId', momentRef));
  if (hasMoment) {
    return existing;
  }

  return {
    ...existing,
    items: [momentRef, ...existing.items],
  };
}

function removeMomentRefFromPagedList(
  existing: unknown,
  momentId: string,
  readField: (fieldName: string, ref: any) => unknown,
) {
  if (!isRecord(existing) || !Array.isArray(existing.items)) {
    return existing;
  }

  return {
    ...existing,
    items: existing.items.filter((item) => readField('momentId', item) !== momentId),
  };
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

  const upsertEventOccurrenceParticipantsCache = (payload: RealtimeEventRsvpPayload) => {
    const occurrenceId = payload.participant.occurrenceId;
    if (!occurrenceId) {
      return;
    }

    const normalizedParticipant = normalizeEventParticipantForOccurrenceParticipantsCache(payload.participant);

    client.cache.updateQuery(
      {
        query: GetEventOccurrenceParticipantsDocument,
        variables: { occurrenceId },
      },
      (existing) => {
        if (!existing?.readEventOccurrenceParticipants) {
          return existing;
        }

        const currentItems = existing.readEventOccurrenceParticipants;
        const existingIndex = currentItems.findIndex(
          (item) => item.participantId === normalizedParticipant.participantId,
        );

        const nextItems =
          existingIndex === -1
            ? [normalizedParticipant as (typeof currentItems)[number], ...currentItems]
            : currentItems.map((item, index) =>
                index === existingIndex
                  ? ({
                      ...item,
                      ...normalizedParticipant,
                    } as (typeof currentItems)[number])
                  : item,
              );

        return {
          ...existing,
          readEventOccurrenceParticipants: nextItems,
        };
      },
    );
  };

  const upsertMyOccurrenceRsvpCaches = (payload: RealtimeEventRsvpPayload) => {
    const occurrenceId = payload.participant.occurrenceId;
    if (payload.participant.userId !== userId || !occurrenceId) {
      return;
    }

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
          myEventOccurrenceRsvpStatus: normalizeEventParticipantForMyOccurrenceRsvpStatusCache(payload.participant),
        };
      },
    );

    void client.refetchQueries({
      include: [GetMyEventOccurrenceRsvpsDocument],
    });
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
                  __typename: 'EventSeriesParticipant',
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
                    __typename: 'EventSeriesParticipant',
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

  const handleRealtimeNotificationUpdated = (payload: RealtimeNotificationPayload) => {
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
          const existingIndex = currentItems.findIndex(
            (item) => item.notificationId === normalizedNotification.notificationId,
          );

          let nextItems = currentItems;
          if (existingIndex >= 0) {
            nextItems = currentItems.map((item, index) =>
              index === existingIndex
                ? ({
                    ...item,
                    ...normalizedNotification,
                  } as (typeof currentItems)[number])
                : item,
            );
          } else if (!unreadOnly || normalizedNotification.isRead === false) {
            const maxItems = Math.max(currentItems.length, DEFAULT_NOTIFICATION_PAGE_LIMIT);
            nextItems = [normalizedNotification as (typeof currentItems)[number], ...currentItems].slice(0, maxItems);
          }

          if (unreadOnly) {
            nextItems = nextItems.filter((item) => item.isRead === false);
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
  };

  const handleRealtimeNotificationDeleted = (payload: RealtimeNotificationDeletedPayload) => {
    client.writeQuery({
      query: GetUnreadNotificationCountDocument,
      data: {
        unreadNotificationCount: payload.unreadCount,
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

    updateNotificationListCache(false);
    updateNotificationListCache(true);
  };

  const handleRealtimeNotificationsAllRead = (payload: RealtimeNotificationsAllReadPayload) => {
    client.writeQuery({
      query: GetUnreadNotificationCountDocument,
      data: {
        unreadNotificationCount: payload.unreadCount,
      },
    });

    client.cache.updateQuery(
      {
        query: GetNotificationsDocument,
        variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT, unreadOnly: false },
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

    client.cache.updateQuery(
      {
        query: GetNotificationsDocument,
        variables: { limit: DEFAULT_NOTIFICATION_PAGE_LIMIT, unreadOnly: true },
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
            notifications: [],
          },
        };
      },
    );
  };

  const handleRealtimeFollowRequest = (payload: RealtimeFollowRequestPayload) => {
    const normalizedFollowRequest = normalizeFollowRequestForCache(payload.follow);
    upsertFollowRequestCache(normalizedFollowRequest);
    updateFollowingCacheForFollowRequest(normalizedFollowRequest);
  };

  const handleRealtimeEventRsvp = (payload: RealtimeEventRsvpPayload) => {
    upsertEventParticipantsCache(payload);
    upsertEventOccurrenceParticipantsCache(payload);
    upsertMyRsvpCaches(payload);
    upsertMyOccurrenceRsvpCaches(payload);
    upsertEventQueryCaches(payload);
  };

  const handleRealtimeEventSave = (payload: RealtimeEventSavePayload) => {
    let shouldRefetchSavedEvents = false;

    client.writeQuery({
      query: IsEventSavedDocument,
      variables: { eventId: payload.eventId },
      data: {
        isEventSaved: payload.isSaved,
      },
    });

    const eventCacheId = client.cache.identify({
      __typename: 'EventSeries',
      eventId: payload.eventId,
    });

    if (eventCacheId) {
      const existingSaveState = client.cache.readFragment<{
        eventId: string;
        isSavedByMe?: boolean | null;
        savedByCount?: number | null;
      }>({
        id: eventCacheId,
        fragment: EVENT_SERIES_SAVE_STATE_FRAGMENT,
      });

      const wasSaved = existingSaveState?.isSavedByMe ?? false;
      const countDelta = wasSaved === payload.isSaved ? 0 : payload.isSaved ? 1 : -1;

      client.cache.writeFragment({
        id: eventCacheId,
        fragment: EVENT_SERIES_SAVE_STATE_FRAGMENT,
        data: {
          __typename: 'EventSeries',
          eventId: payload.eventId,
          isSavedByMe: payload.isSaved,
          savedByCount:
            typeof existingSaveState?.savedByCount === 'number'
              ? Math.max(0, existingSaveState.savedByCount + countDelta)
              : (existingSaveState?.savedByCount ?? null),
        },
      });
    }

    client.cache.modify({
      id: 'ROOT_QUERY',
      fields: {
        readSavedEvents(existing: unknown = [], { readField, toReference }) {
          const currentItems = Array.isArray(existing) ? existing : [];

          if (!Array.isArray(existing)) {
            return existing;
          }

          if (!payload.isSaved) {
            return currentItems.filter((item) => readField('targetId', item as any) !== payload.eventId);
          }

          const alreadySaved = currentItems.some((item) => readField('targetId', item as any) === payload.eventId);
          if (alreadySaved || !payload.followId) {
            return existing;
          }

          if (!eventCacheId) {
            shouldRefetchSavedEvents = true;
            return existing;
          }

          const eventExists = client.cache.readFragment({
            id: eventCacheId,
            fragment: gql`
              fragment WebRealtimeSavedEventPresence on EventSeries {
                eventId
              }
            `,
          });

          if (!eventExists) {
            shouldRefetchSavedEvents = true;
            return existing;
          }

          const followRef = toReference({
            __typename: 'Follow',
            followId: payload.followId,
          });

          client.cache.writeFragment({
            id: client.cache.identify({ __typename: 'Follow', followId: payload.followId }),
            fragment: gql`
              fragment WebRealtimeSavedFollow on Follow {
                followId
                followerUserId
                targetType
                targetId
                createdAt
                targetEvent {
                  __typename
                  eventId
                }
              }
            `,
            data: {
              __typename: 'Follow',
              followId: payload.followId,
              followerUserId: userId,
              targetType: FollowTargetType.EventSeries,
              targetId: payload.eventId,
              createdAt: new Date().toISOString(),
              targetEvent: {
                __typename: 'EventSeries',
                eventId: payload.eventId,
              },
            },
          });

          return followRef ? [followRef, ...currentItems] : currentItems;
        },
      },
    });

    if (payload.isSaved && shouldRefetchSavedEvents) {
      void client.refetchQueries({
        include: [GetSavedEventsDocument],
      });
    }
  };

  const handleRealtimeMomentCreated = (payload: RealtimeMomentCreatedPayload) => {
    const momentRef = client.cache.writeFragment({
      fragment: EVENT_MOMENT_CACHE_FRAGMENT,
      data: {
        __typename: 'EventMoment',
        ...payload.moment,
        author: {
          __typename: 'User',
          ...payload.moment.author,
        },
        event: {
          __typename: 'EventSeries',
          ...payload.moment.event,
        },
      },
    });

    client.cache.modify({
      id: 'ROOT_QUERY',
      fields: {
        readMomentsFeed(existing, details) {
          const { readField } = details as any;
          return prependMomentRefToPagedList(existing, momentRef, (fieldName, ref) => readField(fieldName, ref));
        },
        readFollowedMoments(existing, details) {
          const { readField } = details as any;
          return prependMomentRefToPagedList(existing, momentRef, (fieldName, ref) => readField(fieldName, ref));
        },
        readEventMoments(existing, details) {
          const { args, readField } = details as any;
          return args?.eventId === payload.moment.eventId
            ? prependMomentRefToPagedList(existing, momentRef, (fieldName, ref) => readField(fieldName, ref))
            : existing;
        },
        readUserEventMoments(existing: unknown = [], details) {
          const { args, readField } = details as any;
          if (
            !Array.isArray(existing) ||
            args?.eventId !== payload.moment.eventId ||
            args?.userId !== payload.moment.authorId
          ) {
            return existing;
          }

          const hasMoment = existing.some((item) => readField('momentId', item as any) === payload.moment.momentId);
          return hasMoment ? existing : [momentRef, ...existing];
        },
        readMomentById(existing, details) {
          const { args } = details as any;
          return args?.momentId === payload.moment.momentId ? momentRef : existing;
        },
      },
    });
  };

  const handleRealtimeMomentDeleted = (payload: RealtimeMomentDeletedPayload) => {
    const momentCacheId = client.cache.identify({
      __typename: 'EventMoment',
      momentId: payload.momentId,
    });

    if (momentCacheId) {
      client.cache.evict({ id: momentCacheId });
    }

    client.cache.modify({
      id: 'ROOT_QUERY',
      fields: {
        readMomentsFeed(existing, details) {
          const { readField } = details as any;
          return removeMomentRefFromPagedList(existing, payload.momentId, (fieldName, ref) =>
            readField(fieldName, ref),
          );
        },
        readFollowedMoments(existing, details) {
          const { readField } = details as any;
          return removeMomentRefFromPagedList(existing, payload.momentId, (fieldName, ref) =>
            readField(fieldName, ref),
          );
        },
        readEventMoments(existing, details) {
          const { readField } = details as any;
          return removeMomentRefFromPagedList(existing, payload.momentId, (fieldName, ref) =>
            readField(fieldName, ref),
          );
        },
        readUserEventMoments(existing: unknown = [], details) {
          const { readField } = details as any;
          return Array.isArray(existing)
            ? existing.filter((item) => readField('momentId', item as any) !== payload.momentId)
            : existing;
        },
        readMomentById(existing, details) {
          const { args } = details as any;
          return args?.momentId === payload.momentId ? null : existing;
        },
      },
    });

    client.cache.gc();
  };

  return {
    handleRealtimeEventSave,
    handleRealtimeNotification,
    handleRealtimeNotificationUpdated,
    handleRealtimeNotificationDeleted,
    handleRealtimeNotificationsAllRead,
    handleRealtimeFollowRequest,
    handleRealtimeEventRsvp,
    handleRealtimeMomentCreated,
    handleRealtimeMomentDeleted,
  };
};
