import type {
  EventParticipant,
  UpsertEventParticipantInput,
  CancelEventParticipantInput,
  Event,
  User,
} from '@ntlango/commons/types';
import { ParticipantStatus, NotificationType, NotificationTargetType } from '@ntlango/commons/types';
import { EventParticipantDAO, EventDAO, UserDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { publishEventRsvpUpdated, type EventRsvpRealtimeSnapshot } from '@/websocket/publisher';
import NotificationService from './notification';

/**
 * Extract user ID from an organizer entry (handles both populated User and string reference)
 */
function extractUserId(user: unknown): string | null {
  if (!user) return null;
  if (typeof user === 'string') return user;
  return (user as any).userId || (user as any)._id?.toString() || null;
}

/**
 * Get all organizer user IDs from an event (Host, CoHost, and any other organizer roles)
 * All organizers receive notifications about event activity (RSVPs, check-ins, etc.)
 */
function getEventOrganizerIds(event: Event): string[] {
  if (!event.organizers || event.organizers.length === 0) {
    return [];
  }

  return event.organizers.map((org) => extractUserId(org.user)).filter((id): id is string => id !== null);
}

function toIsoDateString(value?: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

/**
 * Service for managing event participation with notification integration
 */
class EventParticipantService {
  private static toEventRsvpRealtimeSnapshot(
    participant: EventParticipant,
    user: Pick<User, 'userId' | 'username' | 'given_name' | 'family_name' | 'profile_picture'>,
  ): EventRsvpRealtimeSnapshot {
    return {
      participantId: participant.participantId,
      eventId: participant.eventId,
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
    participant: EventParticipant,
    previousStatus: ParticipantStatus | null,
  ): Promise<void> {
    const [event, actor, participants, rsvpCount] = await Promise.all([
      EventDAO.readEventById(participant.eventId),
      UserDAO.readUserById(participant.userId),
      EventParticipantDAO.readByEvent(participant.eventId),
      EventParticipantDAO.countByEvent(participant.eventId, [ParticipantStatus.Going, ParticipantStatus.Interested]),
    ]);

    const organizerIds = getEventOrganizerIds(event);
    const participantUserIds = participants.map((eventParticipant) => eventParticipant.userId);
    const recipientUserIds = [...new Set([...organizerIds, ...participantUserIds, participant.userId])];

    if (recipientUserIds.length === 0) {
      return;
    }

    await publishEventRsvpUpdated(recipientUserIds, {
      participant: this.toEventRsvpRealtimeSnapshot(participant, actor),
      previousStatus,
      rsvpCount,
    });
  }

  /**
   * RSVP to an event (create or update participation)
   * Sends EVENT_RSVP notification to event owner when user RSVPs as Going
   */
  static async rsvp(input: UpsertEventParticipantInput): Promise<EventParticipant> {
    const { eventId, userId, status = ParticipantStatus.Going } = input;

    // Check if this is a new RSVP or an update
    const existingParticipant = await EventParticipantDAO.readByEventAndUser(eventId, userId);
    const isNewRsvp = !existingParticipant;
    const wasNotGoing =
      existingParticipant &&
      existingParticipant.status !== ParticipantStatus.Going &&
      existingParticipant.status !== ParticipantStatus.CheckedIn;

    const participant = await EventParticipantDAO.upsert(input);

    this.publishRsvpUpdatedRealtime(participant, existingParticipant?.status ?? null).catch((error) => {
      logger.warn('Failed to publish RSVP realtime update', {
        error,
        eventId,
        userId,
        status: participant.status,
      });
    });

    // Send notification if this is a new RSVP or user changed to Going status
    if ((isNewRsvp || wasNotGoing) && (status === ParticipantStatus.Going || status === ParticipantStatus.Interested)) {
      this.sendRsvpNotification(eventId, userId, status).catch((err) => {
        logger.error('Failed to send RSVP notification', err);
      });
    }

    return participant;
  }

  /**
   * Cancel RSVP for an event
   * No notification sent for cancellations (by design - avoid negative notifications)
   */
  static async cancel(input: CancelEventParticipantInput): Promise<EventParticipant> {
    const existingParticipant = await EventParticipantDAO.readByEventAndUser(input.eventId, input.userId);
    const participant = await EventParticipantDAO.cancel(input);

    this.publishRsvpUpdatedRealtime(participant, existingParticipant?.status ?? null).catch((error) => {
      logger.warn('Failed to publish RSVP cancellation realtime update', {
        error,
        eventId: input.eventId,
        userId: input.userId,
      });
    });

    return participant;
  }

  /**
   * Check in to an event
   * Sends EVENT_CHECKIN notification to event owner
   */
  static async checkIn(eventId: string, userId: string): Promise<EventParticipant> {
    const existingParticipant = await EventParticipantDAO.readByEventAndUser(eventId, userId);
    const participant = await EventParticipantDAO.upsert({
      eventId,
      userId,
      status: ParticipantStatus.CheckedIn,
    });

    this.publishRsvpUpdatedRealtime(participant, existingParticipant?.status ?? null).catch((error) => {
      logger.warn('Failed to publish RSVP check-in realtime update', {
        error,
        eventId,
        userId,
      });
    });

    // Send check-in notification to event owner
    this.sendCheckInNotification(eventId, userId).catch((err) => {
      logger.error('Failed to send check-in notification', err);
    });

    return participant;
  }

  /**
   * Send RSVP notification to all event organizers (Host, CoHosts, etc.)
   */
  private static async sendRsvpNotification(
    eventId: string,
    actorUserId: string,
    status: ParticipantStatus,
  ): Promise<void> {
    try {
      const event = await EventDAO.readEventById(eventId);
      const organizerIds = getEventOrganizerIds(event);

      // Don't notify if no organizers found
      if (organizerIds.length === 0) {
        return;
      }

      // notifyMany automatically filters out the actor from recipients
      await NotificationService.notifyMany(organizerIds, {
        type: NotificationType.EVENT_RSVP,
        actorUserId,
        targetType: NotificationTargetType.Event,
        targetSlug: event.slug,
        rsvpStatus: status,
      });
    } catch (error) {
      logger.error('Error sending RSVP notification', { error });
    }
  }

  /**
   * Send check-in notification to all event organizers (Host, CoHosts, etc.)
   */
  private static async sendCheckInNotification(eventId: string, actorUserId: string): Promise<void> {
    try {
      const event = await EventDAO.readEventById(eventId);
      const organizerIds = getEventOrganizerIds(event);

      // Don't notify if no organizers found
      if (organizerIds.length === 0) {
        return;
      }

      // notifyMany automatically filters out the actor from recipients
      await NotificationService.notifyMany(organizerIds, {
        type: NotificationType.EVENT_CHECKIN,
        actorUserId,
        targetType: NotificationTargetType.Event,
        targetSlug: event.slug,
      });
    } catch (error) {
      logger.error('Error sending check-in notification', { error });
    }
  }
}

export default EventParticipantService;
