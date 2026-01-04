import {GraphQLError} from 'graphql';
import {Event as EventModel} from '@/mongodb/models';
import type {Event as EventEntity, UpdateEventInput, CreateEventInput, QueryOptionsInput, RsvpInput, CancelRsvpInput} from '@ntlango/commons/types';
import {CustomError, ErrorTypes, KnownCommonError, extractValidationErrorMessage, transformOptionsToPipeline, validateUserIdentifiers} from '@/utils';
import {ERROR_MESSAGES} from '@/validation';
import {EventParticipantDAO} from '@/mongodb/dao';
import {ParticipantStatus, DATE_FILTER_OPTIONS} from '@ntlango/commons';
import {logger} from '@/utils/logger';
import {hasOccurrenceInRange, getDateRangeForFilter} from '@/utils/rrule';


class EventDAO {
  static async create(input: CreateEventInput): Promise<EventEntity> {
    try {
      const event = await (await EventModel.create(input)).populate(['eventCategories', {path: 'organizers.user'}]);
      return event.toObject();
    } catch (error) {
      logger.error('Error creating event', error);
      const validationMessage = extractValidationErrorMessage(error, 'Event validation failed');

      if (validationMessage !== 'Event validation failed') {
        throw CustomError(validationMessage, ErrorTypes.BAD_USER_INPUT);
      }
      throw KnownCommonError(error);
    }
  }

  static async readEventById(eventId: string): Promise<EventEntity> {
    try {
      const query = EventModel.findById(eventId).populate(['eventCategories', {path: 'organizers.user'}]);
      const event = await query.exec();
      if (!event) {
        throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
      }
      return event.toObject();
    } catch (error) {
      logger.error('Error reading event by id', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readEventBySlug(slug: string): Promise<EventEntity> {
    try {
      const query = EventModel.findOne({slug: slug}).populate(['eventCategories', {path: 'organizers.user'}]);
      const event = await query.exec();
      if (!event) {
        throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return event.toObject();
    } catch (error) {
      logger.error('Error reading event by slug:', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readEvents(options?: QueryOptionsInput): Promise<EventEntity[]> {
    try {
      logger.debug('Reading events with options:', options);
      const pipeline = transformOptionsToPipeline(options);
      let events = await EventModel.aggregate<EventEntity>(pipeline).exec();
      
      // Apply date range filtering if provided (filter in application layer since RRULEs are strings)
      // Handle customDate (takes precedence), dateFilterOption, and direct dateRange (for backwards compatibility)
      let dateRangeToUse = options?.dateRange;
      
      if (options?.customDate) {
        // Custom date takes precedence - use it directly
        logger.debug('Using custom date:', options.customDate);
        const calculatedRange = getDateRangeForFilter(DATE_FILTER_OPTIONS.CUSTOM, new Date(options.customDate));
        dateRangeToUse = {
          startDate: calculatedRange.startDate,
          endDate: calculatedRange.endDate,
        };
      } else if (options?.dateFilterOption) {
        // Use predefined filter option
        logger.debug('Calculating date range from filter option:', options.dateFilterOption);
        const calculatedRange = getDateRangeForFilter(options.dateFilterOption, undefined);
        dateRangeToUse = {
          startDate: calculatedRange.startDate,
          endDate: calculatedRange.endDate,
        };
      }

      if (dateRangeToUse?.startDate && dateRangeToUse?.endDate) {
        const {startDate, endDate} = dateRangeToUse;
        logger.debug('Applying date range filter:', {startDate, endDate});
        
        events = events.filter(event => {
          if (!event.recurrenceRule) {
            return false;
          }
          
          return hasOccurrenceInRange(
            event.recurrenceRule,
            new Date(startDate),
            new Date(endDate)
          );
        });
      }
      
      return events;
    } catch (error) {
      logger.error('Error reading events', error);
      throw KnownCommonError(error);
    }
  }

  static async updateEvent(input: UpdateEventInput): Promise<EventEntity> {
    try {
      const {eventId, ...restInput} = input;
      const updatedEvent = await EventModel.findByIdAndUpdate(eventId, restInput, {new: true}).populate(['eventCategories', {path: 'organizers.user'}]).exec();

      if (!updatedEvent) {
        throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
      }
      return updatedEvent.toObject();
    } catch (error) {
      logger.error('Error updating event', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteEventById(eventId: string): Promise<EventEntity> {
    try {
      const deletedEvent = await EventModel.findByIdAndDelete(eventId).populate(['eventCategories', {path: 'organizers.user'}]).exec();
      if (!deletedEvent) {
        throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedEvent.toObject();
    } catch (error) {
      logger.error(`Error deleting event by eventId ${eventId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteEventBySlug(slug: string): Promise<EventEntity> {
    try {
      const deletedEvent = await EventModel.findOneAndDelete({slug}).populate(['eventCategories', {path: 'organizers.user'}]).exec();
      if (!deletedEvent) {
        throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedEvent.toObject();
    } catch (error) {
      logger.error(`Error deleting event with slug ${slug}`, error);
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
      const event = await EventModel.findById(eventId).populate(['eventCategories', {path: 'organizers.user'}]).exec();

      if (!event) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId), ErrorTypes.NOT_FOUND);
      }

      for (const userId of validUserIds) {
        await EventParticipantDAO.upsert({eventId, userId, status: ParticipantStatus.Going});
      }

      return event.toObject();
    } catch (error) {
      logger.error(`Error updating event RSVP's with eventId ${eventId}`, error);
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
      const event = await EventModel.findById(eventId).populate(['eventCategories', {path: 'organizers.user'}]).exec();

      if (!event) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId), ErrorTypes.NOT_FOUND);
      }

      for (const userId of validUserIds) {
        await EventParticipantDAO.cancel({eventId, userId});
      }

      return event.toObject();
    } catch (error) {
      logger.error(`Error cancelling event RSVP's with eventId ${eventId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default EventDAO;
