import {GraphQLError} from 'graphql';
import {Event} from '@/mongodb/models';
import {EventType, UpdateEventInputType, CreateEventInputType, QueryOptionsInput, RSVPInputType, CancelRSVPInputType} from '@/graphql/types';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToPipeline, validateUserIdentifiers} from '@/utils';
import {UpdateQuery} from 'mongoose';
import {ERROR_MESSAGES} from '@/validation';

class EventDAO {
  static async create(input: CreateEventInputType): Promise<EventType> {
    try {
      const event = await (await Event.create(input)).populate('organizerList rSVPList eventCategoryList');
      return event.toObject();
    } catch (error) {
      console.error('Error creating event', error);
      throw KnownCommonError(error);
    }
  }

  static async readEventById(eventId: string): Promise<EventType> {
    try {
      const query = Event.findById(eventId).populate('organizerList rSVPList eventCategoryList');
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

  static async readEventBySlug(slug: string): Promise<EventType> {
    try {
      const query = Event.findOne({slug: slug}).populate('organizerList rSVPList eventCategoryList');
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

  static async readEvents(options?: QueryOptionsInput): Promise<EventType[]> {
    try {
      const pipeline = transformOptionsToPipeline(options);
      const events = await Event.aggregate<EventType>(pipeline).exec();
      return events;
    } catch (error) {
      console.error('Error reading events', error);
      throw KnownCommonError(error);
    }
  }

  static async updateEvent(input: UpdateEventInputType): Promise<EventType> {
    try {
      const {eventId, ...restInput} = input;
      const updatedEvent = await Event.findByIdAndUpdate(eventId, restInput, {new: true}).populate('organizerList rSVPList eventCategoryList').exec();

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

  static async deleteEventById(eventId: string): Promise<EventType> {
    try {
      const deletedEvent = await Event.findByIdAndDelete(eventId).populate('organizerList rSVPList eventCategoryList').exec();
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

  static async deleteEventBySlug(slug: string): Promise<EventType> {
    try {
      const deletedEvent = await Event.findOneAndDelete({slug}).populate('organizerList rSVPList eventCategoryList').exec();
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

  static async RSVP(input: RSVPInputType) {
    const {eventId} = input;

    try {
      const validUserIds = await validateUserIdentifiers(input);
      const updateQuery: UpdateQuery<EventType> = {
        $addToSet: {
          rSVPList: {
            $each: validUserIds,
          },
        },
      };

      const event = await Event.findByIdAndUpdate(eventId, updateQuery, {new: true}).populate('organizerList rSVPList eventCategoryList').exec();

      if (!event) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId), ErrorTypes.NOT_FOUND);
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

  static async cancelRSVP(input: CancelRSVPInputType) {
    const {eventId} = input;

    try {
      const validUserIds = await validateUserIdentifiers(input);
      const updateQuery: UpdateQuery<EventType> = {
        $pull: {
          rSVPList: {
            $in: validUserIds,
          },
        },
      };
      const event = await Event.findByIdAndUpdate(eventId, updateQuery, {new: true}).populate('organizerList rSVPList eventCategoryList').exec();

      if (!event) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId), ErrorTypes.NOT_FOUND);
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
