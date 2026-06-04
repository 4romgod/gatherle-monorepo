import type {
  EventOccurrence,
  EventOccurrenceParticipant,
  QueryOptionsInput,
  EventSeries,
  UpsertEventOccurrenceParticipantInput,
  User,
} from '@gatherle/commons/types';
import {
  EventOccurrenceStatus,
  EventStatus,
  NotificationTargetType,
  NotificationType,
  ParticipantStatus,
} from '@gatherle/commons/types';
import { PUBLIC_OCCURRENCE_QUERY_PARAM, getOccurrencePublicAnchor } from '@gatherle/commons/utils';
import { EventOccurrenceDAO, EventOccurrenceParticipantDAO, EventSeriesDAO, UserDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { publishEventRsvpUpdated, type EventRsvpRealtimeSnapshot } from '@/websocket/publisher';
import { CustomError, ErrorTypes, sumActiveOccurrenceRsvpCount } from '@/utils';
import NotificationService from './notification';

type OrganizerUserReference =
  | string
  | Pick<User, 'userId'>
  | { _id?: string | { toString(): string } }
  | null
  | undefined;

function extractUserId(user: unknown): string | null {
  const organizerUser = user as OrganizerUserReference;
  if (!organizerUser) return null;
  if (typeof organizerUser === 'string') return organizerUser;
  if ('userId' in organizerUser && organizerUser.userId) {
    return organizerUser.userId;
  }

  if ('_id' in organizerUser && organizerUser._id) {
    return organizerUser._id.toString();
  }

  return null;
}

function getEventOrganizerIds(event: EventSeries): string[] {
  if (!event.organizers || event.organizers.length === 0) {
    return [];
  }

  return event.organizers.map((organizer) => extractUserId(organizer.user)).filter((id): id is string => id !== null);
}

function getReservedSlotCount(participant?: Pick<EventOccurrenceParticipant, 'status' | 'quantity'> | null): number {
  if (!participant || !isReservedStatus(participant.status)) {
    return 0;
  }

  return Math.max(1, participant.quantity ?? 1);
}

function toIsoDateString(value?: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function assertOccurrenceRsvpOpen(occurrence: Pick<EventOccurrence, 'startAt' | 'endAt'>): void {
  const comparisonTime = new Date(occurrence.endAt ?? occurrence.startAt).getTime();

  if (!Number.isNaN(comparisonTime) && comparisonTime < Date.now()) {
    throw CustomError('This occurrence has already ended. RSVPs are closed.', ErrorTypes.BAD_REQUEST);
  }
}

function isReservedStatus(status: ParticipantStatus): boolean {
  return status === ParticipantStatus.Going || status === ParticipantStatus.CheckedIn;
}

function getOccurrenceRsvpLimit(eventSeries: Pick<EventSeries, 'rsvpLimit' | 'capacity'>): number | null {
  if (typeof eventSeries.rsvpLimit === 'number' && eventSeries.rsvpLimit > 0) {
    return eventSeries.rsvpLimit;
  }

  if (typeof eventSeries.capacity === 'number' && eventSeries.capacity > 0) {
    return eventSeries.capacity;
  }

  return null;
}

function buildOccurrenceActionUrl(
  eventSeries: Pick<EventSeries, 'slug'>,
  occurrence: Pick<EventOccurrence, 'originalStartAt' | 'startAt'>,
) {
  const occurrenceAnchor = getOccurrencePublicAnchor(occurrence.originalStartAt ?? occurrence.startAt);
  return occurrenceAnchor
    ? `/events/${eventSeries.slug}?${PUBLIC_OCCURRENCE_QUERY_PARAM}=${encodeURIComponent(occurrenceAnchor)}`
    : `/events/${eventSeries.slug}`;
}

function isNotifiableRsvpStatus(status: ParticipantStatus): boolean {
  return status === ParticipantStatus.Going || status === ParticipantStatus.Interested;
}

class EventOccurrenceParticipantService {
  private static async loadOccurrenceContext(
    occurrenceId: string,
  ): Promise<{ occurrence: EventOccurrence; eventSeries: EventSeries }> {
    const occurrence = await EventOccurrenceDAO.readByOccurrenceId(occurrenceId);
    if (!occurrence) {
      throw CustomError(`Occurrence not found for id ${occurrenceId}`, ErrorTypes.NOT_FOUND);
    }

    const eventSeries = await EventSeriesDAO.readEventById(occurrence.eventSeriesId);
    if (occurrence.status !== EventOccurrenceStatus.Scheduled || eventSeries.status === EventStatus.Cancelled) {
      throw CustomError('This occurrence is not accepting RSVP updates.', ErrorTypes.BAD_REQUEST);
    }

    return { occurrence, eventSeries };
  }

  private static toEventRsvpRealtimeSnapshot(
    participant: EventOccurrenceParticipant,
    occurrence: Pick<EventOccurrence, 'eventSeriesId' | 'occurrenceId' | 'occurrenceKey'>,
    user: Pick<User, 'userId' | 'username' | 'given_name' | 'family_name' | 'profile_picture'>,
  ): EventRsvpRealtimeSnapshot {
    return {
      participantId: participant.participantId,
      eventId: occurrence.eventSeriesId,
      occurrenceId: occurrence.occurrenceId,
      occurrenceKey: occurrence.occurrenceKey,
      userId: participant.userId,
      status: participant.status,
      quantity: participant.quantity ?? null,
      sharedVisibility: participant.sharedVisibility ?? null,
      rsvpAt: toIsoDateString(participant.rsvpAt),
      cancelledAt: toIsoDateString(participant.cancelledAt),
      checkedInAt: toIsoDateString(participant.checkedInAt),
      user: {
        userId: user.userId,
        username: user.username,
        given_name: user.given_name,
        family_name: user.family_name,
        profile_picture: user.profile_picture ?? null,
      },
    };
  }

  private static async publishRsvpUpdatedRealtime(
    participant: EventOccurrenceParticipant,
    occurrence: EventOccurrence,
    eventSeries: EventSeries,
    previousStatus: ParticipantStatus | null,
  ): Promise<void> {
    const [actor, participants] = await Promise.all([
      UserDAO.readUserById(participant.userId),
      EventOccurrenceParticipantDAO.readByOccurrence(occurrence.occurrenceId),
    ]);

    const organizerIds = getEventOrganizerIds(eventSeries);
    const participantUserIds = participants.map((occurrenceParticipant) => occurrenceParticipant.userId);
    const recipientUserIds = [...new Set([...organizerIds, ...participantUserIds, participant.userId])];
    const rsvpCount = sumActiveOccurrenceRsvpCount(participants);

    if (recipientUserIds.length === 0) {
      return;
    }

    await publishEventRsvpUpdated(recipientUserIds, {
      participant: this.toEventRsvpRealtimeSnapshot(participant, occurrence, actor),
      previousStatus,
      rsvpCount,
    });
  }

  private static async sendRsvpNotification(
    eventSeries: EventSeries,
    occurrence: EventOccurrence,
    actorUserId: string,
    status: ParticipantStatus,
  ): Promise<void> {
    try {
      const organizerIds = getEventOrganizerIds(eventSeries);
      if (organizerIds.length === 0) {
        return;
      }

      await NotificationService.notifyMany(organizerIds, {
        type: NotificationType.EVENT_RSVP,
        actorUserId,
        targetType: NotificationTargetType.EventSeries,
        targetSlug: eventSeries.slug,
        occurrenceId: occurrence.occurrenceId,
        occurrenceAnchor: occurrence.originalStartAt.toISOString(),
        actionUrl: buildOccurrenceActionUrl(eventSeries, occurrence),
        rsvpStatus: status,
      });
    } catch (error) {
      logger.error('Error sending recurring occurrence RSVP notification', { error, actorUserId });
    }
  }

  private static async sendCheckInNotification(
    eventSeries: EventSeries,
    occurrence: EventOccurrence,
    actorUserId: string,
  ): Promise<void> {
    try {
      const organizerIds = getEventOrganizerIds(eventSeries);
      if (organizerIds.length === 0) {
        return;
      }

      await NotificationService.notifyMany(organizerIds, {
        type: NotificationType.EVENT_CHECKIN,
        actorUserId,
        targetType: NotificationTargetType.EventSeries,
        targetSlug: eventSeries.slug,
        occurrenceId: occurrence.occurrenceId,
        occurrenceAnchor: occurrence.originalStartAt.toISOString(),
        actionUrl: buildOccurrenceActionUrl(eventSeries, occurrence),
      });
    } catch (error) {
      logger.error('Error sending recurring occurrence check-in notification', { error, actorUserId });
    }
  }

  private static async promoteWaitlistedParticipants(
    occurrence: EventOccurrence,
    eventSeries: EventSeries,
  ): Promise<void> {
    const rsvpLimit = getOccurrenceRsvpLimit(eventSeries);
    if (!eventSeries.waitlistEnabled || !rsvpLimit) {
      return;
    }

    while (true) {
      const participants = await EventOccurrenceParticipantDAO.readByOccurrence(occurrence.occurrenceId);
      const waitlistedParticipant = participants.find(
        (participant) => participant.status === ParticipantStatus.Waitlisted,
      );
      if (!waitlistedParticipant) {
        return;
      }

      const requestedQuantity = Math.max(1, waitlistedParticipant.quantity ?? 1);
      const reservedSlots = await EventOccurrenceDAO.reserveSlots(
        occurrence.occurrenceId,
        requestedQuantity,
        rsvpLimit,
      );
      if (!reservedSlots) {
        return;
      }

      const promotedParticipant = await EventOccurrenceParticipantDAO.promoteWaitlisted(
        occurrence.occurrenceId,
        waitlistedParticipant.userId,
      );
      if (!promotedParticipant) {
        await EventOccurrenceDAO.releaseReservedSlots(occurrence.occurrenceId, requestedQuantity);
        continue;
      }

      this.publishRsvpUpdatedRealtime(promotedParticipant, occurrence, eventSeries, ParticipantStatus.Waitlisted).catch(
        (error) => {
          logger.warn('Failed to publish waitlist promotion realtime update', {
            error,
            occurrenceId: occurrence.occurrenceId,
            userId: waitlistedParticipant.userId,
          });
        },
      );
    }
  }

  static async rsvp(input: UpsertEventOccurrenceParticipantInput, userId: string): Promise<EventOccurrenceParticipant> {
    const { occurrence, eventSeries } = await this.loadOccurrenceContext(input.occurrenceId);
    assertOccurrenceRsvpOpen(occurrence);
    const requestedStatus: ParticipantStatus = input.status ?? ParticipantStatus.Going;

    if (requestedStatus !== ParticipantStatus.Going && requestedStatus !== ParticipantStatus.Interested) {
      throw CustomError(
        'Occurrence RSVP only supports Going or Interested statuses. Use cancel or check-in mutations for other transitions.',
        ErrorTypes.BAD_REQUEST,
      );
    }

    const quantity = Math.max(1, input.quantity ?? 1);
    if (!Number.isInteger(quantity)) {
      throw CustomError('Occurrence RSVP quantity must be a whole number.', ErrorTypes.BAD_REQUEST);
    }

    if (!eventSeries.allowGuestPlusOnes && quantity > 1) {
      throw CustomError('This event occurrence does not allow guest plus-ones.', ErrorTypes.BAD_REQUEST);
    }

    const existingParticipant = await EventOccurrenceParticipantDAO.readByOccurrenceAndUser(
      occurrence.occurrenceId,
      userId,
    );

    const isNewRsvp = !existingParticipant;
    let finalStatus: ParticipantStatus = requestedStatus;
    let reservedSlotsDelta = 0;
    const rsvpLimit = getOccurrenceRsvpLimit(eventSeries);
    if (requestedStatus === ParticipantStatus.Going && rsvpLimit) {
      const currentReservedSlots = getReservedSlotCount(existingParticipant);
      reservedSlotsDelta = Math.max(0, quantity - currentReservedSlots);

      if (reservedSlotsDelta > 0) {
        const reservedSlots = await EventOccurrenceDAO.reserveSlots(
          occurrence.occurrenceId,
          reservedSlotsDelta,
          rsvpLimit,
        );

        if (!reservedSlots) {
          reservedSlotsDelta = 0;
          if (eventSeries.waitlistEnabled) {
            finalStatus = ParticipantStatus.Waitlisted;
          } else {
            throw CustomError('This occurrence is full and does not allow waitlisting.', ErrorTypes.BAD_REQUEST);
          }
        }
      }
    }

    let participant: EventOccurrenceParticipant;
    try {
      participant = await EventOccurrenceParticipantDAO.upsert({
        ...input,
        quantity,
        userId,
        status: finalStatus,
      });
    } catch (error) {
      if (reservedSlotsDelta > 0) {
        await EventOccurrenceDAO.releaseReservedSlots(occurrence.occurrenceId, reservedSlotsDelta);
      }
      throw error;
    }

    const releasedReservedSlots = getReservedSlotCount(existingParticipant) - getReservedSlotCount(participant);
    if (releasedReservedSlots > 0) {
      await EventOccurrenceDAO.releaseReservedSlots(occurrence.occurrenceId, releasedReservedSlots);
    }

    this.publishRsvpUpdatedRealtime(participant, occurrence, eventSeries, existingParticipant?.status ?? null).catch(
      (error) => {
        logger.warn('Failed to publish occurrence RSVP realtime update', {
          error,
          occurrenceId: occurrence.occurrenceId,
          userId,
          status: participant.status,
        });
      },
    );

    if (isNotifiableRsvpStatus(finalStatus) && (isNewRsvp || existingParticipant?.status !== finalStatus)) {
      this.sendRsvpNotification(eventSeries, occurrence, userId, finalStatus).catch((error) => {
        logger.error('Failed to send occurrence RSVP notification', { error, occurrenceId: occurrence.occurrenceId });
      });
    }

    if (releasedReservedSlots > 0) {
      await this.promoteWaitlistedParticipants(occurrence, eventSeries);
    }

    return participant;
  }

  static async cancel(occurrenceId: string, userId: string): Promise<EventOccurrenceParticipant> {
    const { occurrence, eventSeries } = await this.loadOccurrenceContext(occurrenceId);
    assertOccurrenceRsvpOpen(occurrence);
    const existingParticipant = await EventOccurrenceParticipantDAO.readByOccurrenceAndUser(occurrenceId, userId);
    const participant = await EventOccurrenceParticipantDAO.cancel(occurrenceId, userId);

    this.publishRsvpUpdatedRealtime(participant, occurrence, eventSeries, existingParticipant?.status ?? null).catch(
      (error) => {
        logger.warn('Failed to publish occurrence RSVP cancellation realtime update', {
          error,
          occurrenceId,
          userId,
        });
      },
    );

    if (existingParticipant && isReservedStatus(existingParticipant.status)) {
      await EventOccurrenceDAO.releaseReservedSlots(occurrenceId, getReservedSlotCount(existingParticipant));
      await this.promoteWaitlistedParticipants(occurrence, eventSeries);
    }

    return participant;
  }

  static async checkIn(occurrenceId: string, userId: string): Promise<EventOccurrenceParticipant> {
    const { occurrence, eventSeries } = await this.loadOccurrenceContext(occurrenceId);
    const existingParticipant = await EventOccurrenceParticipantDAO.readByOccurrenceAndUser(occurrenceId, userId);

    if (!existingParticipant || !isReservedStatus(existingParticipant.status)) {
      throw CustomError('You must have a Going RSVP before checking in to this occurrence.', ErrorTypes.BAD_REQUEST);
    }

    const participant = await EventOccurrenceParticipantDAO.upsert({
      occurrenceId,
      userId,
      status: ParticipantStatus.CheckedIn,
      quantity: existingParticipant.quantity,
      invitedBy: existingParticipant.invitedBy,
      sharedVisibility: existingParticipant.sharedVisibility,
    });

    this.publishRsvpUpdatedRealtime(participant, occurrence, eventSeries, existingParticipant.status).catch((error) => {
      logger.warn('Failed to publish occurrence RSVP check-in realtime update', {
        error,
        occurrenceId,
        userId,
      });
    });

    this.sendCheckInNotification(eventSeries, occurrence, userId).catch((error) => {
      logger.error('Failed to send occurrence check-in notification', { error, occurrenceId });
    });

    return participant;
  }

  static async readByUser(
    userId: string,
    activeOnly = true,
    options?: QueryOptionsInput,
  ): Promise<EventOccurrenceParticipant[]> {
    return EventOccurrenceParticipantDAO.readByUser(userId, activeOnly, options);
  }
}

export default EventOccurrenceParticipantService;
