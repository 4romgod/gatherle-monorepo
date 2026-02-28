import { Event as EventModel } from '@/mongodb/models';
import type {
  Event as EventEntity,
  UpdateEventInput,
  CreateEventInput,
  EventsQueryOptionsInput,
  RsvpInput,
  CancelRsvpInput,
} from '@gatherle/commons/types';
import {
  CustomError,
  ErrorTypes,
  KnownCommonError,
  extractValidationErrorMessage,
  transformEventOptionsToPipeline,
  validateUserIdentifiers,
  enrichLocationWithCoordinates,
  createEventLookupStages,
  logDaoError,
} from '@/utils';
import { ERROR_MESSAGES } from '@/validation';
import { EventParticipantDAO } from '@/mongodb/dao';
import { ParticipantStatus, DATE_FILTER_OPTIONS } from '@gatherle/commons';
import { logger } from '@/utils/logger';
import { hasOccurrenceInRange, getDateRangeForFilter } from '@/utils/rrule';

class EventDAO {
  static async create(input: CreateEventInput): Promise<EventEntity> {
    try {
      // Geocode address to coordinates if location has address but no coordinates
      if (input.location) {
        await enrichLocationWithCoordinates(input.location);
      }

      const event = await EventModel.create(input);
      return event.toObject();
    } catch (error) {
      logDaoError('Error creating event', { error });
      const validationMessage = extractValidationErrorMessage(error, 'Event validation failed');

      if (validationMessage !== 'Event validation failed') {
        throw CustomError(validationMessage, ErrorTypes.BAD_USER_INPUT);
      }
      throw KnownCommonError(error);
    }
  }

  static async readEventById(eventId: string): Promise<EventEntity> {
    let events;
    try {
      const pipeline = [{ $match: { eventId: eventId } }, ...createEventLookupStages()];
      events = await EventModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading event by id', { error });
      throw KnownCommonError(error);
    }
    if (!events || events.length === 0) {
      throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
    }
    return events[0];
  }

  static async readEventBySlug(slug: string): Promise<EventEntity> {
    let events;
    try {
      // Use aggregation pipeline to include participants lookup
      const pipeline = [{ $match: { slug: slug } }, ...createEventLookupStages()];
      events = await EventModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading event by slug:', { error });
      throw KnownCommonError(error);
    }
    if (!events || events.length === 0) {
      throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return events[0];
  }

  static async readEvents(options?: EventsQueryOptionsInput): Promise<EventEntity[]> {
    try {
      logger.debug('Reading events with options:', options);

      // Transform options to aggregation pipeline (handles filters, location, sort, pagination)
      const pipeline = transformEventOptionsToPipeline(options);

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
        logger.debug('Calculating date range from filter option:', { dateFilterOption: options.dateFilterOption });
        const calculatedRange = getDateRangeForFilter(options.dateFilterOption, undefined);
        dateRangeToUse = {
          startDate: calculatedRange.startDate,
          endDate: calculatedRange.endDate,
        };
      }

      if (dateRangeToUse?.startDate && dateRangeToUse?.endDate) {
        const { startDate, endDate } = dateRangeToUse;
        logger.debug('Applying date range filter:', { startDate, endDate });

        // TODO: Consider moving RRULE date filtering into the aggregation pipeline so pagination/sorting
        // respect the date constraints before skip/limit stages execute.
        events = events.filter((event) => {
          if (!event.recurrenceRule) {
            return false;
          }

          return hasOccurrenceInRange(event.recurrenceRule, new Date(startDate), new Date(endDate));
        });
      }

      return events;
    } catch (error) {
      logDaoError('Error reading events', { error });
      throw KnownCommonError(error);
    }
  }

  static async updateEvent(input: UpdateEventInput): Promise<EventEntity> {
    const { eventId, ...restInput } = input;
    let event;
    try {
      event = await EventModel.findById(eventId).exec();
    } catch (error) {
      logDaoError('Error finding event for update', { error });
      throw KnownCommonError(error);
    }

    if (!event) {
      throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
    }

    try {
      // Geocode address to coordinates if location is being updated
      if (restInput.location) {
        await enrichLocationWithCoordinates(restInput.location);
      }

      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(Object.entries(restInput).filter(([_, value]) => value !== undefined));
      Object.assign(event, fieldsToUpdate);
      await event.save();
      return event.toObject();
    } catch (error) {
      logDaoError('Error updating event', { error });
      throw KnownCommonError(error);
    }
  }

  static async deleteEventById(eventId: string): Promise<EventEntity> {
    let deletedEvent;
    try {
      deletedEvent = await EventModel.findByIdAndDelete(eventId).exec();
    } catch (error) {
      logDaoError(`Error deleting event by eventId ${eventId}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedEvent) {
      throw CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedEvent.toObject();
  }

  static async deleteEventBySlug(slug: string): Promise<EventEntity> {
    let deletedEvent;
    try {
      deletedEvent = await EventModel.findOneAndDelete({ slug }).exec();
    } catch (error) {
      logDaoError(`Error deleting event with slug ${slug}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedEvent) {
      throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedEvent.toObject();
  }

  static async RSVP(input: RsvpInput) {
    const { eventId } = input;

    let validUserIds;
    let event;
    try {
      validUserIds = await validateUserIdentifiers(input);
      event = await EventModel.findById(eventId).exec();
    } catch (error) {
      logDaoError(`Error reading event for RSVP with eventId ${eventId}`, { error });
      throw KnownCommonError(error);
    }

    if (!event) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId), ErrorTypes.NOT_FOUND);
    }

    try {
      for (const userId of validUserIds) {
        await EventParticipantDAO.upsert({ eventId, userId, status: ParticipantStatus.Going });
      }
      return event.toObject();
    } catch (error) {
      logDaoError(`Error updating event RSVP's with eventId ${eventId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async cancelRSVP(input: CancelRsvpInput) {
    const { eventId } = input;

    let validUserIds;
    let event;
    try {
      validUserIds = await validateUserIdentifiers(input);
      event = await EventModel.findById(eventId).exec();
    } catch (error) {
      logDaoError(`Error reading event for cancel RSVP with eventId ${eventId}`, { error });
      throw KnownCommonError(error);
    }

    if (!event) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId), ErrorTypes.NOT_FOUND);
    }

    try {
      for (const userId of validUserIds) {
        await EventParticipantDAO.cancel({ eventId, userId });
      }
      return event.toObject();
    } catch (error) {
      logDaoError(`Error cancelling event RSVP's with eventId ${eventId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async count(filter: Record<string, unknown> = {}): Promise<number> {
    try {
      return EventModel.countDocuments(filter).exec();
    } catch (error) {
      logDaoError('Error counting events', { error });
      throw KnownCommonError(error);
    }
  }
}

export default EventDAO;
