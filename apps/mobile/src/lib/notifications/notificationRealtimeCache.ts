import { gql, type ApolloClient } from '@apollo/client';
import {
  GetPendingFollowRequestsDocument,
  GetSavedEventsDocument,
  IsEventSavedDocument,
} from '@data/graphql/query/Follow/query';
import {
  GetMyEventOccurrenceRsvpStatusDocument,
  GetMyEventOccurrenceRsvpsDocument,
} from '@data/graphql/query/EventOccurrenceParticipant/query';
import { GetNotificationsDocument, GetUnreadNotificationCountDocument } from '@data/graphql/query/Notification/query';
import { FollowApprovalStatus, FollowTargetType } from '@data/graphql/types/graphql';
import type {
  MobileRealtimeEventSavePayload,
  MobileRealtimeEventRsvpPayload,
  MobileRealtimeFollowRequestPayload,
  MobileRealtimeMomentCreatedPayload,
  MobileRealtimeMomentDeletedPayload,
  MobileRealtimeMomentUpdatedPayload,
  MobileRealtimeNotificationDeletedPayload,
  MobileRealtimeNotificationPayload,
  MobileRealtimeNotificationsAllReadPayload,
} from './notificationRealtimeProtocol';

const DEFAULT_NOTIFICATION_PAGE_LIMIT = 24;

interface CreateMobileNotificationRealtimeCacheHandlersParams {
  client: ApolloClient<object>;
  userId: string;
}

const EVENT_SERIES_SAVE_STATE_FRAGMENT = gql`
  fragment MobileRealtimeEventSeriesSaveState on EventSeries {
    eventId
    isSavedByMe
    savedByCount
  }
`;

const EVENT_MOMENT_CACHE_FRAGMENT = gql`
  fragment MobileRealtimeEventMoment on EventMoment {
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

type SavedEventsModifierArgs = {
  options?: {
    skip?: number | null;
  } | null;
};

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

  const handleRealtimeEventSave = (payload: MobileRealtimeEventSavePayload) => {
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
        readSavedEvents(existing: unknown = [], details) {
          const { readField, toReference } = details;
          const currentItems = Array.isArray(existing) ? existing : [];
          const args = (details as typeof details & { args?: SavedEventsModifierArgs }).args;
          const skip = typeof args?.options?.skip === 'number' ? args.options.skip : 0;

          if (!Array.isArray(existing)) {
            return existing;
          }

          if (!payload.isSaved) {
            return currentItems.filter((item) => readField('targetId', item as any) !== payload.eventId);
          }

          if (skip > 0) {
            return existing;
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
              fragment MobileRealtimeSavedEventPresence on EventSeries {
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
              fragment MobileRealtimeSavedFollow on Follow {
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

  const handleRealtimeMomentCreated = (payload: MobileRealtimeMomentCreatedPayload) => {
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
        readUserMoments(existing, details) {
          const { args, readField } = details as any;
          return args?.userId === payload.moment.authorId
            ? prependMomentRefToPagedList(existing, momentRef, (fieldName, ref) => readField(fieldName, ref))
            : existing;
        },
        readMomentById(existing, details) {
          const { args } = details as any;
          return args?.momentId === payload.moment.momentId ? momentRef : existing;
        },
      },
    });
  };

  const handleRealtimeMomentUpdated = (payload: MobileRealtimeMomentUpdatedPayload) => {
    handleRealtimeMomentCreated(payload);
  };

  const handleRealtimeMomentDeleted = (payload: MobileRealtimeMomentDeletedPayload) => {
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
        readUserMoments(existing, details) {
          const { readField } = details as any;
          return removeMomentRefFromPagedList(existing, payload.momentId, (fieldName, ref) =>
            readField(fieldName, ref),
          );
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
    handleRealtimeEventRsvp,
    handleRealtimeNotification,
    handleRealtimeNotificationDeleted,
    handleRealtimeNotificationsAllRead,
    handleRealtimeFollowRequest,
    handleRealtimeMomentCreated,
    handleRealtimeMomentUpdated,
    handleRealtimeMomentDeleted,
  };
};
