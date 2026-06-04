import type { EventMoment, EventSeries } from '@gatherle/commons/server/types';
import { EventSeriesDAO, UserDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import {
  publishMomentCreatedToRecipients,
  publishMomentDeletedToRecipients,
  publishMomentUpdatedToRecipients,
  type RealtimeMomentSnapshot,
} from '@/websocket/publisher';

type EventMomentRecipientEvent = Pick<EventSeries, 'eventId' | 'organizers' | 'slug' | 'title'>;

function normalizeUserId(userId: string): string {
  return userId.trim();
}

function extractOrganizerUserId(organizerUser: unknown): string | null {
  if (typeof organizerUser === 'string' && organizerUser.trim().length > 0) {
    return normalizeUserId(organizerUser);
  }

  if (organizerUser && typeof organizerUser === 'object') {
    const organizerRecord = organizerUser as Record<string, unknown>;
    const userId = organizerRecord.userId;
    if (typeof userId === 'string' && userId.trim().length > 0) {
      return normalizeUserId(userId);
    }

    const organizerId = organizerRecord._id;
    if (organizerId && typeof organizerId.toString === 'function') {
      const asString = organizerId.toString();
      return asString.trim().length > 0 ? normalizeUserId(asString) : null;
    }

    if (typeof organizerUser.toString === 'function') {
      const asString = organizerUser.toString();
      if (asString && asString !== '[object Object]') {
        return normalizeUserId(asString);
      }
    }
  }

  return null;
}

function getRecipientUserIds(
  moment: Pick<EventMoment, 'authorId'>,
  event: Pick<EventSeries, 'organizers'> | null,
): string[] {
  const organizerIds =
    event?.organizers
      ?.map((organizer) => extractOrganizerUserId(organizer.user))
      .filter((userId): userId is string => Boolean(userId)) ?? [];

  return [...new Set([moment.authorId, ...organizerIds].map(normalizeUserId).filter((userId) => userId.length > 0))];
}

async function resolveRealtimeEvent(eventId: string): Promise<EventMomentRecipientEvent | null> {
  try {
    return await EventSeriesDAO.readEventById(eventId);
  } catch (error) {
    logger.warn('[eventMomentRealtime] Failed to load event while resolving realtime recipients', {
      error,
      eventId,
    });
    return null;
  }
}

export async function buildRealtimeMomentSnapshot(
  moment: EventMoment,
  event?: EventMomentRecipientEvent | null,
): Promise<RealtimeMomentSnapshot> {
  const [author, resolvedEvent] = await Promise.all([
    UserDAO.readUserById(moment.authorId),
    event ? Promise.resolve(event) : resolveRealtimeEvent(moment.eventId),
  ]);

  if (!resolvedEvent) {
    throw new Error(`Unable to load event ${moment.eventId} for realtime moment snapshot`);
  }

  return {
    momentId: moment.momentId,
    eventId: moment.eventId,
    occurrenceId: moment.occurrenceId ?? null,
    authorId: moment.authorId,
    type: moment.type,
    state: moment.state,
    caption: moment.caption ?? null,
    mediaUrl: moment.mediaUrl ?? null,
    thumbnailUrl: moment.thumbnailUrl ?? null,
    imageDisplayMode: moment.imageDisplayMode ?? null,
    background: moment.background ?? null,
    durationSeconds: moment.durationSeconds ?? null,
    expiresAt: moment.expiresAt.toISOString(),
    createdAt: moment.createdAt.toISOString(),
    author: {
      userId: author.userId,
      username: author.username,
      given_name: author.given_name,
      family_name: author.family_name,
      profile_picture: author.profile_picture ?? null,
    },
    event: {
      eventId: resolvedEvent.eventId,
      slug: resolvedEvent.slug,
      title: resolvedEvent.title,
    },
  };
}

export async function publishMomentCreatedForScopedRecipients(
  moment: EventMoment,
  event?: EventMomentRecipientEvent | null,
): Promise<void> {
  const resolvedEvent = event ?? (await resolveRealtimeEvent(moment.eventId));
  const recipientUserIds = getRecipientUserIds(moment, resolvedEvent);
  const snapshot = await buildRealtimeMomentSnapshot(moment, resolvedEvent);

  await publishMomentCreatedToRecipients(recipientUserIds, { moment: snapshot });
}

export async function publishMomentUpdatedForScopedRecipients(
  moment: EventMoment,
  event?: EventMomentRecipientEvent | null,
): Promise<void> {
  const resolvedEvent = event ?? (await resolveRealtimeEvent(moment.eventId));
  const recipientUserIds = getRecipientUserIds(moment, resolvedEvent);
  const snapshot = await buildRealtimeMomentSnapshot(moment, resolvedEvent);

  await publishMomentUpdatedToRecipients(recipientUserIds, { moment: snapshot });
}

export async function publishMomentDeletedForScopedRecipients(
  moment: Pick<EventMoment, 'authorId' | 'eventId' | 'momentId' | 'occurrenceId'>,
  event?: EventMomentRecipientEvent | null,
): Promise<void> {
  const resolvedEvent = event ?? (await resolveRealtimeEvent(moment.eventId));
  const recipientUserIds = getRecipientUserIds(moment, resolvedEvent);

  await publishMomentDeletedToRecipients(recipientUserIds, {
    momentId: moment.momentId,
    eventId: moment.eventId,
    occurrenceId: moment.occurrenceId ?? null,
    authorId: moment.authorId,
  });
}
