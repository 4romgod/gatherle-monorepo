import {GraphQLError} from 'graphql';
import {Event as EventModel} from '@/mongodb/models';
import type {
  Event as EventEntity,
  UpdateEventInput,
  CreateEventInput,
  QueryOptionsInput,
  RsvpInput,
  CancelRsvpInput,
} from '@ntlango/commons/types';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToPipeline, validateUserIdentifiers} from '@/utils';
import {ERROR_MESSAGES} from '@/validation';
import {EventParticipantDAO} from '@/mongodb/dao';

class EventDAO {
  static async create(input: CreateEventInput): Promise<EventEntity> {
    try {
      const event = await (await EventModel.create(input)).populate('organizerList eventCategoryList');
      return event.toObject();
    } catch (error) {
      console.error('Error creating event', error);
      throw KnownCommonError(error);
    }
  }

  static async readEventById(eventId: string): Promise<EventEntity> {
    try {
      const query = EventModel.findById(eventId).populate('organizerList eventCategoryList');
      const event = await query.exec();
      if (!event) {
        throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
      }
      return event.toObject();
    } catch (error) {
      console.error('Error reading event by id', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readEventBySlug(slug: string): Promise<EventEntity> {
    try {
      const query = EventModel.findOne({slug: slug}).populate('organizerList eventCategoryList');
      const event = await query.exec();
      if (!event) {
        throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return event.toObject();
    } catch (error) {
      console.error('Error reading event by slug:', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readEvents(options?: QueryOptionsInput): Promise<EventEntity[]> {
    try {
      const pipeline = transformOptionsToPipeline(options);
      const events = await EventModel.aggregate<EventEntity>(pipeline).exec();
      return events;
    } catch (error) {
      console.error('Error reading events', error);
      throw KnownCommonError(error);
    }
  }

  static async updateEvent(input: UpdateEventInput): Promise<EventEntity> {
    try {
      const {eventId, ...restInput} = input;
      const updatedEvent = await EventModel.findByIdAndUpdate(eventId, restInput, {new: true})
        .populate('organizerList eventCategoryList')
        .exec();

      if (!updatedEvent) {
        throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
      }
      return updatedEvent.toObject();
    } catch (error) {
      console.error('Error updating event', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteEventById(eventId: string): Promise<EventEntity> {
    try {
      const deletedEvent = await EventModel.findByIdAndDelete(eventId)
        .populate('organizerList eventCategoryList')
        .exec();
      if (!deletedEvent) {
        throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedEvent.toObject();
    } catch (error) {
      console.error(`Error deleting event by eventId ${eventId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteEventBySlug(slug: string): Promise<EventEntity> {
    try {
      const deletedEvent = await EventModel.findOneAndDelete({slug})
        .populate('organizerList eventCategoryList')
        .exec();
      if (!deletedEvent) {
        throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedEvent.toObject();
    } catch (error) {
      console.error(`Error deleting event with slug ${slug}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async RSVP(input: RsvpInput) {
    const {eventId} = input;

    try {
      const validUserIds = await validateUserIdentifiers(input);
      const event = await EventModel.findById(eventId).populate('organizerList eventCategoryList').exec();

      if (!event) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId), ErrorTypes.NOT_FOUND);
      }

      // Best-effort participant upsert; do not block the RSVP flow if participant write fails
      for (const userId of validUserIds) {
        try {
          await EventParticipantDAO.upsert({eventId, userId});
        } catch (participantError) {
          console.warn('Participant upsert failed (non-blocking)', participantError);
        }
      }

      return event.toObject();
    } catch (error) {
      console.error(`Error updating event RSVP's with eventId ${eventId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async cancelRSVP(input: CancelRsvpInput) {
    const {eventId} = input;

    try {
      const validUserIds = await validateUserIdentifiers(input);
      const event = await EventModel.findById(eventId).populate('organizerList eventCategoryList').exec();

      if (!event) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId), ErrorTypes.NOT_FOUND);
      }

      for (const userId of validUserIds) {
        try {
          await EventParticipantDAO.cancel({eventId, userId});
        } catch (participantError) {
          console.warn(`Participant cancel failed (non-blocking) for userId ${userId} and eventId ${eventId}`, participantError);
        }
      }

      return event.toObject();
    } catch (error) {
      console.error(`Error cancelling event RSVP's with eventId ${eventId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default EventDAO;
