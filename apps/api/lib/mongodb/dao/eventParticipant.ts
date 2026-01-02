import {GraphQLError} from 'graphql';
import type {UpdateQuery} from 'mongoose';
import {Types} from 'mongoose';
import type {EventParticipant as EventParticipantEntity, UpsertEventParticipantInput, CancelEventParticipantInput} from '@ntlango/commons/types';
import {ParticipantStatus} from '@ntlango/commons/types';
import {EventParticipant} from '@/mongodb/models';
import {CustomError, ErrorTypes, KnownCommonError} from '@/utils';
import {logger} from '@/utils/logger';


class EventParticipantDAO {
  static async upsert(input: UpsertEventParticipantInput): Promise<EventParticipantEntity> {
    try {
      const {eventId, userId, status = ParticipantStatus.Going, quantity, invitedBy, sharedVisibility} = input;

      const update: UpdateQuery<EventParticipantEntity> = {
        status,
        $setOnInsert: {
          participantId: new Types.ObjectId().toString(),
          rsvpAt: new Date(),
        },
      };
      if (quantity !== undefined) update.quantity = quantity;
      if (invitedBy !== undefined) update.invitedBy = invitedBy;
      if (sharedVisibility !== undefined) update.sharedVisibility = sharedVisibility;

      const participant = await EventParticipant.findOneAndUpdate({eventId, userId}, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }).exec();

      if (!participant) {
        throw CustomError('Unable to upsert participant', ErrorTypes.INTERNAL_SERVER_ERROR);
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
      const participant = await EventParticipant.findOneAndUpdate(
        {eventId, userId},
        {status: ParticipantStatus.Cancelled, cancelledAt: new Date()},
        {new: true},
      ).exec();

      if (!participant) {
        throw CustomError(`Participant not found for event ${eventId}`, ErrorTypes.NOT_FOUND);
      }

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
