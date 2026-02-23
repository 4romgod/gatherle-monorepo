import type {
  EventParticipant as EventParticipantEntity,
  UpsertEventParticipantInput,
  CancelEventParticipantInput,
} from '@gatherle/commons/types';
import { ParticipantStatus } from '@gatherle/commons/types';
import { EventParticipant } from '@/mongodb/models';
import { CustomError, ErrorTypes, KnownCommonError } from '@/utils';
import { logger } from '@/utils/logger';

class EventParticipantDAO {
  /**
   * Batch fetch all participants for multiple eventIds.
   * Returns a flat array of participants for all given eventIds.
   * Used for DataLoader batching by eventId.
   */
  static async readByEvents(eventIds: string[]): Promise<EventParticipantEntity[]> {
    try {
      const participants = await EventParticipant.find({ eventId: { $in: eventIds } }).exec();
      return participants.map((p) => p.toObject());
    } catch (error) {
      logger.error('Error reading participants by events', { error });
      throw KnownCommonError(error);
    }
  }
  static async upsert(input: UpsertEventParticipantInput): Promise<EventParticipantEntity> {
    try {
      const { eventId, userId, status = ParticipantStatus.Going, quantity, invitedBy, sharedVisibility } = input;

      let participant = await EventParticipant.findOne({ eventId, userId }).exec();

      if (participant) {
        participant.status = status;
        if (quantity !== undefined) participant.quantity = quantity;
        if (invitedBy !== undefined) participant.invitedBy = invitedBy;
        if (sharedVisibility !== undefined) participant.sharedVisibility = sharedVisibility;
        await participant.save();
      } else {
        participant = await EventParticipant.create({
          eventId,
          userId,
          status,
          quantity,
          invitedBy,
          sharedVisibility,
          rsvpAt: new Date(),
        });
      }

      return participant.toObject();
    } catch (error) {
      logger.error('Error upserting event participant', { error });
      throw KnownCommonError(error);
    }
  }

  static async cancel(input: CancelEventParticipantInput): Promise<EventParticipantEntity> {
    const { eventId, userId } = input;
    let participant;
    try {
      participant = await EventParticipant.findOne({ eventId, userId }).exec();
    } catch (error) {
      logger.error('Error finding event participant for cancellation', { error });
      throw KnownCommonError(error);
    }

    if (!participant) {
      throw CustomError(`Participant not found for event ${eventId}`, ErrorTypes.NOT_FOUND);
    }

    try {
      participant.status = ParticipantStatus.Cancelled;
      participant.cancelledAt = new Date();
      await participant.save();
      return participant.toObject();
    } catch (error) {
      logger.error('Error cancelling event participant', { error });
      throw KnownCommonError(error);
    }
  }

  static async readByEvent(eventId: string): Promise<EventParticipantEntity[]> {
    try {
      const participants = await EventParticipant.find({ eventId }).exec();
      return participants.map((p) => p.toObject());
    } catch (error) {
      logger.error('Error reading participants', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Read all RSVPs for a specific user across all events.
   * Useful for "My Events" page showing events user has RSVP'd to.
   */
  static async readByUser(userId: string, activeOnly = true): Promise<EventParticipantEntity[]> {
    try {
      const query: Record<string, unknown> = { userId };
      if (activeOnly) {
        query.status = { $ne: ParticipantStatus.Cancelled };
      }
      const participants = await EventParticipant.find(query).exec();
      return participants.map((p) => p.toObject());
    } catch (error) {
      logger.error('Error reading user RSVPs', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Get a specific user's RSVP for a specific event.
   * Returns null if user has not RSVP'd.
   */
  static async readByEventAndUser(eventId: string, userId: string): Promise<EventParticipantEntity | null> {
    try {
      const participant = await EventParticipant.findOne({ eventId, userId }).exec();
      return participant ? participant.toObject() : null;
    } catch (error) {
      logger.error('Error reading user RSVP for event', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Count participants for an event, optionally filtered by status.
   * Useful for showing "X people going" on event cards.
   */
  static async countByEvent(eventId: string, statuses?: ParticipantStatus[]): Promise<number> {
    try {
      const query: Record<string, unknown> = { eventId };
      if (statuses && statuses.length > 0) {
        query.status = { $in: statuses };
      } else {
        // By default, exclude cancelled
        query.status = { $ne: ParticipantStatus.Cancelled };
      }
      return await EventParticipant.countDocuments(query).exec();
    } catch (error) {
      logger.error('Error counting event participants', { error });
      throw KnownCommonError(error);
    }
  }
}

export default EventParticipantDAO;
