import type {
  EventParticipant,
  UpsertEventParticipantInput,
  CancelEventParticipantInput,
  Event,
} from '@ntlango/commons/types';
import { ParticipantStatus, NotificationType, NotificationTargetType } from '@ntlango/commons/types';
import { EventParticipantDAO, EventDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
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

/**
 * Service for managing event participation with notification integration
 */
class EventParticipantService {
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
    return EventParticipantDAO.cancel(input);
  }

  /**
   * Check in to an event
   * Sends EVENT_CHECKIN notification to event owner
   */
  static async checkIn(eventId: string, userId: string): Promise<EventParticipant> {
    const participant = await EventParticipantDAO.upsert({
      eventId,
      userId,
      status: ParticipantStatus.CheckedIn,
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
    } catch (err) {
      logger.error('Error sending RSVP notification', err);
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
    } catch (err) {
      logger.error('Error sending check-in notification', err);
    }
  }
}

export default EventParticipantService;
