import {GraphQLError} from 'graphql';
import type {EventParticipant as EventParticipantEntity, UpsertEventParticipantInput, CancelEventParticipantInput} from '@ntlango/commons/types';
import {ParticipantStatus} from '@ntlango/commons/types';
import {EventParticipant} from '@/mongodb/models';
import {CustomError, ErrorTypes, KnownCommonError} from '@/utils';
import {logger} from '@/utils/logger';


class EventParticipantDAO {
  static async upsert(input: UpsertEventParticipantInput): Promise<EventParticipantEntity> {
    try {
      const {eventId, userId, status = ParticipantStatus.Going, quantity, invitedBy, sharedVisibility} = input;

      let participant = await EventParticipant.findOne({eventId, userId}).exec();
      
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
      logger.error('Error upserting event participant', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async cancel(input: CancelEventParticipantInput): Promise<EventParticipantEntity> {
    try {
      const {eventId, userId} = input;
      const participant = await EventParticipant.findOne({eventId, userId}).exec();

      if (!participant) {
        throw CustomError(`Participant not found for event ${eventId}`, ErrorTypes.NOT_FOUND);
      }
      
      participant.status = ParticipantStatus.Cancelled;
      participant.cancelledAt = new Date();
      await participant.save();

      return participant.toObject();
    } catch (error) {
      logger.error('Error cancelling event participant', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readByEvent(eventId: string): Promise<EventParticipantEntity[]> {
    try {
      const participants = await EventParticipant.find({eventId}).exec();
      return participants.map((p) => p.toObject());
    } catch (error) {
      logger.error('Error reading participants', error);
      throw KnownCommonError(error);
    }
  }
}

export default EventParticipantDAO;
