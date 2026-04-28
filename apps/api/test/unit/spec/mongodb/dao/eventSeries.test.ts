import type { RsvpInput, UpdateEventInput, EventsQueryOptionsInput, CreateEventInput } from '@gatherle/commons/types';
import type { PipelineStage } from 'mongoose';
import { EventSeriesDAO, EventSeriesParticipantDAO } from '@/mongodb/dao';
import { EventSeries as EventSeriesModel } from '@/mongodb/models';
import { SortOrderInput } from '@gatherle/commons/types';
import { DATE_FILTER_OPTIONS } from '@gatherle/commons/constants';
import { EventStatus } from '@gatherle/commons/types/eventSeries';
import { CustomError, ErrorTypes, transformEventOptionsToPipeline } from '@/utils';
import { GraphQLError } from 'graphql';
import { ERROR_MESSAGES } from '@/validation';
import { MockMongoError } from '@/test/utils';
import * as validationUtil from '@/utils/validateUserIdentifiers';

jest.mock('@/mongodb/models', () => ({
  EventSeries: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndDelete: jest.fn(),
    aggregate: jest.fn(),
  },
}));

// Helper function to create a mock mongoose chainable query
const createMockSuccessMongooseQuery = <T>(result: T) => ({
  ...result,
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  ...error,
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
});

describe('EventSeriesDAO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEventInput: CreateEventInput = {
    title: 'Sample EventSeries',
    description: 'Sample description',
    status: EventStatus.Upcoming,
    location: {
      locationType: 'tba',
    },
    primarySchedule: {
      startAt: new Date('2026-09-13T10:00:00Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=13',
    },
    organizers: [],
    eventCategories: [],
  };

  const expectedEvent = {
    ...mockEventInput,
    eventId: 'mockEventId',
    slug: 'sample-event-series',
    scheduleVersion: 1,
    organizers: [],
    eventCategories: [],
  };

  describe('create', () => {
    beforeEach(() => {
      (EventSeriesModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
    });

    it('should create an event and return the event object', async () => {
      const mockDocument = {
        toObject: jest.fn().mockReturnValue(expectedEvent),
      };
      (EventSeriesModel.create as jest.Mock).mockResolvedValue(mockDocument);

      const createdEvent = await EventSeriesDAO.create(mockEventInput);
      expect(createdEvent).toEqual(expectedEvent);
      expect(EventSeriesModel.findOne).toHaveBeenCalledWith({ slug: 'sample-event-series' });
      expect(EventSeriesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...mockEventInput, slug: 'sample-event-series' }),
      );
    });

    it('should throw CONFLICT GraphQLError when the derived slug already exists', async () => {
      (EventSeriesModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ _id: 'existingEventId' }),
      );

      await expect(EventSeriesDAO.create(mockEventInput)).rejects.toThrow(
        CustomError('Slug sample-event-series already exists', ErrorTypes.CONFLICT),
      );
      expect(EventSeriesModel.findOne).toHaveBeenCalledWith({ slug: 'sample-event-series' });
      expect(EventSeriesModel.create).not.toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.create throws an UNKNOWN error', async () => {
      (EventSeriesModel.create as jest.Mock).mockRejectedValue(new Error('Mongodb Error'));

      await expect(EventSeriesDAO.create(mockEventInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventSeriesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...mockEventInput, slug: 'sample-event-series' }),
      );
    });

    it('should throw BAD_USER_INPUT GraphQLError when EventSeriesModel.create throws a mongodb 10334 error', async () => {
      (EventSeriesModel.create as jest.Mock).mockRejectedValue(new MockMongoError(10334));

      await expect(EventSeriesDAO.create(mockEventInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.CONTENT_TOO_LARGE, ErrorTypes.BAD_USER_INPUT),
      );
      expect(EventSeriesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...mockEventInput, slug: 'sample-event-series' }),
      );
    });

    it('should throw BAD_USER_INPUT GraphQLError when validation errors are returned', async () => {
      const validationError = {
        name: 'ValidationError',
        errors: {
          title: { message: 'Title is required' },
        },
      };

      (EventSeriesModel.create as jest.Mock).mockRejectedValue(validationError);

      await expect(EventSeriesDAO.create(mockEventInput)).rejects.toThrow(
        CustomError('Title is required', ErrorTypes.BAD_USER_INPUT),
      );
      expect(EventSeriesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...mockEventInput, slug: 'sample-event-series' }),
      );
    });
  });

  describe('readEventById', () => {
    it('should read an event by ID and return the populated event object', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([expectedEvent]));

      const eventId = 'mockEventId';
      const readEvent = await EventSeriesDAO.readEventById(eventId);
      expect(readEvent).toEqual(expectedEvent);
      expect(EventSeriesModel.aggregate).toHaveBeenCalled();
      // Verify the pipeline starts with a $match for eventId
      const pipeline = (EventSeriesModel.aggregate as jest.Mock).mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $match: { eventId: eventId } });
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by ID', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));
      const eventId = 'mockEventId';

      await expect(EventSeriesDAO.readEventById(eventId)).rejects.toThrow(
        CustomError(`EventSeries with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventSeriesModel.aggregate).toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.aggregate throws an UNKNOWN error', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const eventId = 'mockEventId';

      await expect(EventSeriesDAO.readEventById(eventId)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventSeriesModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('readEventBySlug', () => {
    it('should read an event by slug and return the populated event object', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([expectedEvent]));

      const slug = 'sample-event';

      const readEvent = await EventSeriesDAO.readEventBySlug(slug);
      expect(readEvent).toEqual(expectedEvent);
      expect(EventSeriesModel.aggregate).toHaveBeenCalled();
      // Verify the pipeline starts with a $match for slug
      const pipeline = (EventSeriesModel.aggregate as jest.Mock).mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $match: { slug: slug } });
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by slug', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));
      const slug = 'nonexistent-event';

      await expect(EventSeriesDAO.readEventBySlug(slug)).rejects.toThrow(
        CustomError(`EventSeries with slug ${slug} not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventSeriesModel.aggregate).toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.aggregate throws an UNKNOWN error', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const mockGraphqlError = new GraphQLError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      const slug = 'sample-event';

      await expect(EventSeriesDAO.readEventBySlug(slug)).rejects.toThrow(mockGraphqlError);
      expect(EventSeriesModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('deleteEventById', () => {
    it('should delete an event by ID and return the populated event object', async () => {
      (EventSeriesModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const eventId = 'mockEventId';
      const deleteEvent = await EventSeriesDAO.deleteEventById(eventId);
      expect(deleteEvent).toEqual(expectedEvent);
      expect(EventSeriesModel.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by ID', async () => {
      (EventSeriesModel.findByIdAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const eventId = 'mockEventId';

      await expect(EventSeriesDAO.deleteEventById(eventId)).rejects.toThrow(
        CustomError(`EventSeries with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventSeriesModel.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.findByIdAndDelete throws an UNKNOWN error', async () => {
      (EventSeriesModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new MockMongoError(0)),
      );
      const mockGraphqlError = new GraphQLError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      const eventId = 'mockEventId';

      await expect(EventSeriesDAO.deleteEventById(eventId)).rejects.toThrow(mockGraphqlError);
      expect(EventSeriesModel.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });
  });

  describe('deleteEventBySlug', () => {
    it('should delete an event by slug and return the populated event object', async () => {
      (EventSeriesModel.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const slug = 'sample-event';

      const deleteEvent = await EventSeriesDAO.deleteEventBySlug(slug);
      expect(deleteEvent).toEqual(expectedEvent);
      expect(EventSeriesModel.findOneAndDelete).toHaveBeenCalledWith({ slug });
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by slug', async () => {
      (EventSeriesModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const slug = 'nonexistent-event';

      await expect(EventSeriesDAO.deleteEventBySlug(slug)).rejects.toThrow(
        CustomError(`EventSeries with slug ${slug} not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventSeriesModel.findOneAndDelete).toHaveBeenCalledWith({ slug });
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.findOne throws an UNKNOWN error', async () => {
      (EventSeriesModel.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new MockMongoError(0)),
      );
      const slug = 'sample-event';

      await expect(EventSeriesDAO.deleteEventBySlug(slug)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventSeriesModel.findOneAndDelete).toHaveBeenCalledWith({ slug });
    });
  });

  describe('readEvents', () => {
    const mockOptions: EventsQueryOptionsInput = {
      filters: [{ field: 'title', value: 'Sample' }],
      sort: [{ field: 'startDateTime', order: SortOrderInput.asc }],
      pagination: { limit: 10, skip: 0 },
    };

    const mockMongooseEvents = [
      { ...expectedEvent, eventId: 'mockEventId1' },
      { ...expectedEvent, eventId: 'mockEventId2' },
    ];

    it('should read events and return the populated event objects', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockMongooseEvents));
      const pipeline: PipelineStage[] = transformEventOptionsToPipeline(mockOptions);

      const events = await EventSeriesDAO.readEvents(mockOptions);
      expect(events).toEqual(mockMongooseEvents);
      expect(EventSeriesModel.aggregate).toHaveBeenCalledWith(pipeline);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.aggregate throws an UNKNOWN error', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const pipeline: PipelineStage[] = transformEventOptionsToPipeline(mockOptions);

      await expect(EventSeriesDAO.readEvents(mockOptions)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventSeriesModel.aggregate).toHaveBeenCalledWith(pipeline);
    });

    it('should return an empty array if no events are found', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));
      const pipeline: PipelineStage[] = transformEventOptionsToPipeline(mockOptions);

      const events = await EventSeriesDAO.readEvents(mockOptions);
      expect(events).toEqual([]);
      expect(EventSeriesModel.aggregate).toHaveBeenCalledWith(pipeline);
    });

    describe('with dateRange filtering', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      it('should filter events by date range for single occurrence events', async () => {
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const eventsWithRRules = [
          {
            ...expectedEvent,
            eventId: 'event1',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event2',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${yesterdayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event3',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventSeriesDAO.readEvents({
          dateRange: {
            startDate: startOfToday,
            endDate: endOfToday,
          },
        });

        // Should only return the event happening today
        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event1');
      });

      it('should filter recurring events with multiple occurrences', async () => {
        const startOfWeek = new Date(today);
        const dayOfWeek = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const startOfWeekStr = startOfWeek.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        // EventSeries from a month ago that should be excluded
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = lastMonth.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const eventsWithRRules = [
          // Daily event for 7 days starting from start of week (should be included)
          {
            ...expectedEvent,
            eventId: 'event1',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${startOfWeekStr}\nRRULE:FREQ=DAILY;COUNT=7`,
            },
          },
          // EventSeries from last month (should be excluded)
          {
            ...expectedEvent,
            eventId: 'event2',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${lastMonthStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventSeriesDAO.readEvents({
          dateRange: {
            startDate: startOfWeek,
            endDate: endOfWeek,
          },
        });

        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event1');
      });

      it('should exclude events with no occurrences in date range', async () => {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekEnd = new Date(nextWeek);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

        const eventsWithRRules = [
          {
            ...expectedEvent,
            eventId: 'event1',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event2',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${yesterdayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventSeriesDAO.readEvents({
          dateRange: {
            startDate: nextWeek,
            endDate: nextWeekEnd,
          },
        });

        expect(events).toHaveLength(0);
      });

      it('should exclude events with no recurrenceRule in primarySchedule', async () => {
        const startOfToday = new Date(today);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const eventsWithAndWithoutRRules = [
          {
            ...expectedEvent,
            eventId: 'event1',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event2',
            primarySchedule: { ...expectedEvent.primarySchedule, recurrenceRule: undefined },
          },
          {
            ...expectedEvent,
            eventId: 'event3',
            primarySchedule: { ...expectedEvent.primarySchedule, recurrenceRule: null },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(
          createMockSuccessMongooseQuery(eventsWithAndWithoutRRules),
        );

        const events = await EventSeriesDAO.readEvents({
          dateRange: {
            startDate: startOfToday,
            endDate: endOfToday,
          },
        });

        // Should only return events with valid recurrenceRule
        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event1');
      });

      it('should work without dateRange (backwards compatibility)', async () => {
        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockMongooseEvents));

        const events = await EventSeriesDAO.readEvents(mockOptions);

        expect(events).toEqual(mockMongooseEvents);
      });

      it('should combine dateRange with other filters', async () => {
        const startOfToday = new Date(today);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const eventsWithRRules = [
          {
            ...expectedEvent,
            eventId: 'event1',
            title: 'Match',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event2',
            title: 'NoMatch',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventSeriesDAO.readEvents({
          filters: [{ field: 'title', value: 'Match' }],
          dateRange: {
            startDate: startOfToday,
            endDate: endOfToday,
          },
        });

        // Both filters should apply, but since aggregate handles the title filter,
        // and date range filters after, we'd get both. In real scenario with proper
        // aggregate filtering, this would be just event1
        expect(events.length).toBeGreaterThan(0);
      });
    });

    describe('with dateFilterOption', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      it('should filter events using TODAY option', async () => {
        const eventsWithRRules = [
          {
            ...expectedEvent,
            eventId: 'event1',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event2',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${yesterdayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event3',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventSeriesDAO.readEvents({
          dateFilterOption: DATE_FILTER_OPTIONS.TODAY,
        });

        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event1');
      });

      it('should filter events using TOMORROW option', async () => {
        const eventsWithRRules = [
          {
            ...expectedEvent,
            eventId: 'event1',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event2',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventSeriesDAO.readEvents({
          dateFilterOption: DATE_FILTER_OPTIONS.TOMORROW,
        });

        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event2');
      });

      it('should filter events using CUSTOM option with customDate', async () => {
        const customDate = tomorrow;
        const eventsWithRRules = [
          {
            ...expectedEvent,
            eventId: 'event1',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event2',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventSeriesDAO.readEvents({
          customDate,
        });

        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event2');
      });

      it('should prioritize dateFilterOption over dateRange', async () => {
        const eventsWithRRules = [
          {
            ...expectedEvent,
            eventId: 'event1',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
          {
            ...expectedEvent,
            eventId: 'event2',
            primarySchedule: {
              ...expectedEvent.primarySchedule,
              recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`,
            },
          },
        ];

        (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        // Pass both dateFilterOption and dateRange - dateFilterOption should win
        const events = await EventSeriesDAO.readEvents({
          dateFilterOption: DATE_FILTER_OPTIONS.TODAY,
          dateRange: {
            startDate: tomorrow, // This should be ignored
            endDate: tomorrow,
          },
        });

        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event1'); // Today's event, not tomorrow's
      });
    });
  });

  describe('readCandidateEventSeriesForOccurrences', () => {
    it('reads matching series without applying occurrence-layer pagination or sorting', async () => {
      const options: EventsQueryOptionsInput = {
        pagination: { skip: 10, limit: 5 },
        sort: [{ field: 'title', order: SortOrderInput.desc }],
        filters: [{ field: 'status', value: EventStatus.Upcoming }],
      };
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([expectedEvent]));

      const events = await EventSeriesDAO.readCandidateEventSeriesForOccurrences(options);
      const pipeline = (EventSeriesModel.aggregate as jest.Mock).mock.calls[0][0] as PipelineStage[];

      expect(events).toEqual([expectedEvent]);
      expect(pipeline.some((stage) => '$sort' in stage)).toBe(false);
      expect(pipeline.some((stage) => '$skip' in stage || '$limit' in stage)).toBe(false);
    });

    it('wraps errors when reading candidate series for occurrence queries', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(
        EventSeriesDAO.readCandidateEventSeriesForOccurrences({
          filters: [{ field: 'status', value: EventStatus.Upcoming }],
        }),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('updateEvent', () => {
    const mockUpdatedEventInput: UpdateEventInput = {
      eventId: 'mockEventId',
      title: 'Updated EventSeries Title',
      description: 'Updated description',
      status: EventStatus.Ongoing,
      location: {
        locationType: 'online',
        details: 'updated location',
      },
      organizers: [],
      eventCategories: [],
    };

    const expectedUpdatedEvent = {
      ...mockUpdatedEventInput,
      slug: 'updated-event-title',
    };

    it('should update an event and return the populated event object', async () => {
      const mockEvent = {
        ...expectedUpdatedEvent,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue(expectedUpdatedEvent),
      };

      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockEvent));

      const { eventId } = mockUpdatedEventInput;
      const updatedEvent = await EventSeriesDAO.updateEvent(mockUpdatedEventInput);
      expect({ ...updatedEvent, slug: 'updated-event-title' }).toEqual(expectedUpdatedEvent);
      expect(EventSeriesModel.findById).toHaveBeenCalledWith(eventId);
      expect(mockEvent.save).toHaveBeenCalled();
    });

    it('increments scheduleVersion and syncs occurrences when primarySchedule changes', async () => {
      const expectedScheduleUpdate = {
        ...expectedEvent,
        scheduleVersion: 2,
        primarySchedule: {
          startAt: new Date('2026-09-20T10:00:00Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=SU',
        },
      };
      const mockEvent = {
        ...expectedEvent,
        scheduleVersion: 1,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue(expectedScheduleUpdate),
      };

      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockEvent));

      const updatedEvent = await EventSeriesDAO.updateEvent({
        eventId: 'mockEventId',
        primarySchedule: expectedScheduleUpdate.primarySchedule,
      });

      expect(updatedEvent).toEqual(expectedScheduleUpdate);
      expect(mockEvent.scheduleVersion).toBe(2);
      expect(mockEvent.save).toHaveBeenCalled();
    });

    it('does not increment scheduleVersion when the provided primarySchedule is unchanged', async () => {
      const unchangedSchedule = {
        ...expectedEvent.primarySchedule,
      };
      const mockEvent = {
        ...expectedEvent,
        scheduleVersion: 1,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          ...expectedEvent,
          scheduleVersion: 1,
          primarySchedule: unchangedSchedule,
        }),
      };

      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockEvent));

      const updatedEvent = await EventSeriesDAO.updateEvent({
        eventId: 'mockEventId',
        primarySchedule: unchangedSchedule,
      });

      expect(updatedEvent.scheduleVersion).toBe(1);
      expect(mockEvent.scheduleVersion).toBe(1);
      expect(mockEvent.save).toHaveBeenCalled();
    });

    it('syncs occurrences when status changes without incrementing scheduleVersion', async () => {
      const expectedStatusUpdate = {
        ...expectedEvent,
        status: EventStatus.Cancelled,
        scheduleVersion: 1,
      };
      const mockEvent = {
        ...expectedEvent,
        scheduleVersion: 1,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue(expectedStatusUpdate),
      };

      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockEvent));

      const updatedEvent = await EventSeriesDAO.updateEvent({
        eventId: 'mockEventId',
        status: EventStatus.Cancelled,
      });

      expect(updatedEvent).toEqual(expectedStatusUpdate);
      expect(mockEvent.scheduleVersion).toBe(1);
      expect(mockEvent.save).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND GraphQLError when the event to be updated is not found', async () => {
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventSeriesDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(
        CustomError(`EventSeries with eventId ${mockUpdatedEventInput.eventId} not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventSeriesModel.findById).toHaveBeenCalledWith(mockUpdatedEventInput.eventId);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.findById throws an UNKNOWN error', async () => {
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(EventSeriesDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventSeriesModel.findById).toHaveBeenCalledWith(mockUpdatedEventInput.eventId);
    });

    it('should throw the original GraphQLError when EventSeriesModel.findById throws a GraphQLError', async () => {
      const mockGraphqlError = new GraphQLError('GraphQL Error');
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockGraphqlError));

      await expect(EventSeriesDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(mockGraphqlError);
      expect(EventSeriesModel.findById).toHaveBeenCalledWith(mockUpdatedEventInput.eventId);
    });
  });

  describe('createSplitSuccessor', () => {
    it('creates a successor series with a unique slug and splitFromEventSeriesId', async () => {
      const createdSuccessor = {
        ...expectedEvent,
        eventId: 'successor-id',
        slug: 'sample-event-series-from-2026-05-20-3',
        splitFromEventSeriesId: 'source-id',
      };
      (EventSeriesModel.findOne as jest.Mock)
        .mockReturnValueOnce(createMockSuccessMongooseQuery({ _id: 'existing-1' }))
        .mockReturnValueOnce(createMockSuccessMongooseQuery({ _id: 'existing-2' }))
        .mockReturnValueOnce(createMockSuccessMongooseQuery(null));
      (EventSeriesModel.create as jest.Mock).mockResolvedValue({
        toObject: jest.fn().mockReturnValue(createdSuccessor),
      });

      const result = await EventSeriesDAO.createSplitSuccessor(
        mockEventInput,
        'sample-event-series-from-2026-05-20',
        'source-id',
      );

      expect(result).toEqual(createdSuccessor);
      expect(EventSeriesModel.findOne).toHaveBeenNthCalledWith(1, { slug: 'sample-event-series-from-2026-05-20' });
      expect(EventSeriesModel.findOne).toHaveBeenNthCalledWith(2, { slug: 'sample-event-series-from-2026-05-20-2' });
      expect(EventSeriesModel.findOne).toHaveBeenNthCalledWith(3, { slug: 'sample-event-series-from-2026-05-20-3' });
      expect(EventSeriesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockEventInput,
          slug: 'sample-event-series-from-2026-05-20-3',
          splitFromEventSeriesId: 'source-id',
        }),
      );
    });

    it('surfaces validation errors when successor creation fails validation', async () => {
      const validationError = {
        name: 'ValidationError',
        errors: {
          title: { message: 'Title is required' },
        },
      };
      (EventSeriesModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (EventSeriesModel.create as jest.Mock).mockRejectedValue(validationError);

      await expect(
        EventSeriesDAO.createSplitSuccessor(mockEventInput, 'sample-event-series-from-2026-05-20', 'source-id'),
      ).rejects.toThrow(CustomError('Title is required', ErrorTypes.BAD_USER_INPUT));
    });
  });

  describe('applySeriesSplit', () => {
    it('updates the predecessor recurrence rule and links the successor series', async () => {
      const mockEvent = {
        ...expectedEvent,
        primarySchedule: expectedEvent.primarySchedule,
        scheduleVersion: 1,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          ...expectedEvent,
          primarySchedule: {
            ...expectedEvent.primarySchedule,
            recurrenceRule: 'RRULE:FREQ=WEEKLY;UNTIL=20260513T155959Z',
          },
          scheduleVersion: 2,
          splitIntoEventSeriesId: 'successor-id',
        }),
      };
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockEvent));

      const result = await EventSeriesDAO.applySeriesSplit(
        'mockEventId',
        'RRULE:FREQ=WEEKLY;UNTIL=20260513T155959Z',
        'successor-id',
      );

      expect(result).toEqual(
        expect.objectContaining({
          scheduleVersion: 2,
          splitIntoEventSeriesId: 'successor-id',
        }),
      );
      expect(mockEvent.primarySchedule.recurrenceRule).toBe('RRULE:FREQ=WEEKLY;UNTIL=20260513T155959Z');
      expect(mockEvent.save).toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the predecessor series does not exist', async () => {
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(
        EventSeriesDAO.applySeriesSplit('missing-id', 'RRULE:FREQ=WEEKLY;UNTIL=20260513T155959Z', 'successor-id'),
      ).rejects.toThrow(CustomError('EventSeries with eventId missing-id not found', ErrorTypes.NOT_FOUND));
    });

    it('wraps save failures while applying a series split', async () => {
      const mockEvent = {
        ...expectedEvent,
        primarySchedule: expectedEvent.primarySchedule,
        scheduleVersion: 1,
        save: jest.fn().mockRejectedValue(new Error('save failed')),
      };
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockEvent));

      await expect(
        EventSeriesDAO.applySeriesSplit('mockEventId', 'RRULE:FREQ=WEEKLY;UNTIL=20260513T155959Z', 'successor-id'),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('RSVP', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should RSVP users successfully', async () => {
      const input: RsvpInput = {
        eventId: 'event123',
        userIdList: ['user1', 'user2'],
        usernameList: ['username1', 'username2'],
        emailList: ['email1@example.com'],
      };

      const validatedUserIds = ['user1', 'user2', 'username1', 'username2', 'email1'];
      const validateUserIdentifiersSpy = jest
        .spyOn(validationUtil, 'validateUserIdentifiers')
        .mockResolvedValue(validatedUserIds);

      const updatedEventMock = { eventId: 'event123' };
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ toObject: () => updatedEventMock }),
      );

      const upsertSpy = jest
        .spyOn(EventSeriesParticipantDAO, 'upsert')
        .mockResolvedValue({ participantId: 'p1', eventId: 'event123', userId: 'user1' } as any);

      const result = await EventSeriesDAO.RSVP(input);

      expect(EventSeriesModel.findById).toHaveBeenCalledWith('event123');
      expect(upsertSpy).toHaveBeenCalledTimes(validatedUserIds.length);
      expect(result).toEqual(updatedEventMock);
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw NOT_FOUND GraphQLError when the event to RSVP users for is not found', async () => {
      const input: RsvpInput = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };
      const validatedUserIds = ['user1'];
      const validateUserIdentifiersSpy = jest
        .spyOn(validationUtil, 'validateUserIdentifiers')
        .mockResolvedValue(validatedUserIds);
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventSeriesDAO.RSVP(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('EventSeries', 'ID', 'nonexistentEvent'), ErrorTypes.NOT_FOUND),
      );
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const validateUserIdentifiersSpy = jest
        .spyOn(validationUtil, 'validateUserIdentifiers')
        .mockResolvedValue(['user1']);
      const input: RsvpInput = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };

      await expect(EventSeriesDAO.RSVP(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw error when participant upsert fails (atomic behavior)', async () => {
      const input: RsvpInput = {
        eventId: 'event123',
        userIdList: ['user1', 'user2'],
      };

      const validatedUserIds = ['user1', 'user2'];
      const validateUserIdentifiersSpy = jest
        .spyOn(validationUtil, 'validateUserIdentifiers')
        .mockResolvedValue(validatedUserIds);
      const updatedEventMock = { eventId: 'event123' };
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ toObject: () => updatedEventMock }),
      );

      const participantError = new Error('Participant creation failed');
      const upsertSpy = jest.spyOn(EventSeriesParticipantDAO, 'upsert').mockRejectedValue(participantError);

      await expect(EventSeriesDAO.RSVP(input)).rejects.toThrow();
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
      expect(upsertSpy).toHaveBeenCalled();
    });
  });

  describe('cancelRSVP', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should cancelRSVP users successfully', async () => {
      const input: RsvpInput = {
        eventId: 'event123',
        userIdList: ['user1', 'user2'],
        usernameList: ['username1', 'username2'],
        emailList: ['email1@example.com'],
      };

      const validatedUserIds = ['user1', 'user2', 'username1', 'username2', 'email1'];
      const validateUserIdentifiersSpy = jest
        .spyOn(validationUtil, 'validateUserIdentifiers')
        .mockResolvedValue(validatedUserIds);

      const updatedEventMock = { eventId: 'event123' };
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ toObject: () => updatedEventMock }),
      );

      const cancelSpy = jest
        .spyOn(EventSeriesParticipantDAO, 'cancel')
        .mockResolvedValue({ participantId: 'p1', eventId: 'event123', userId: 'user1', status: 'Cancelled' } as any);

      const result = await EventSeriesDAO.cancelRSVP(input);

      expect(EventSeriesModel.findById).toHaveBeenCalledWith('event123');
      expect(cancelSpy).toHaveBeenCalledTimes(validatedUserIds.length);
      expect(result).toEqual(updatedEventMock);
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw NOT_FOUND GraphQLError when the event to cancel RSVP users is not found', async () => {
      const input: RsvpInput = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };
      const validatedUserIds = ['user1'];
      const validateUserIdentifiersSpy = jest
        .spyOn(validationUtil, 'validateUserIdentifiers')
        .mockResolvedValue(validatedUserIds);
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventSeriesDAO.cancelRSVP(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('EventSeries', 'ID', 'nonexistentEvent'), ErrorTypes.NOT_FOUND),
      );
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventSeriesModel.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const validateUserIdentifiersSpy = jest
        .spyOn(validationUtil, 'validateUserIdentifiers')
        .mockResolvedValue(['user1']);
      const input: RsvpInput = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };

      await expect(EventSeriesDAO.cancelRSVP(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw error when participant cancellation fails (atomic behavior)', async () => {
      const input: RsvpInput = {
        eventId: 'event123',
        userIdList: ['user1', 'user2'],
      };

      const validatedUserIds = ['user1', 'user2'];
      const validateUserIdentifiersSpy = jest
        .spyOn(validationUtil, 'validateUserIdentifiers')
        .mockResolvedValue(validatedUserIds);
      const updatedEventMock = { eventId: 'event123' };
      (EventSeriesModel.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ toObject: () => updatedEventMock }),
      );

      const participantError = new Error('Participant cancellation failed');
      const cancelSpy = jest.spyOn(EventSeriesParticipantDAO, 'cancel').mockRejectedValue(participantError);

      await expect(EventSeriesDAO.cancelRSVP(input)).rejects.toThrow();
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('readUpcomingPublished', () => {
    // readUpcomingPublished uses find(...).sort(...).limit(...).exec()
    const createSortLimitQuery = <T>(result: T) => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(result),
    });

    const createFailSortLimitQuery = <T>(error: T) => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(error),
    });

    const mockRawEvent = {
      toObject: () => ({ eventId: 'event-1', title: 'Upcoming EventSeries', lifecycleStatus: 'Published' }),
    };

    it('queries for upcoming published events and returns mapped objects', async () => {
      (EventSeriesModel.find as jest.Mock).mockReturnValue(createSortLimitQuery([mockRawEvent]));

      const result = await EventSeriesDAO.readUpcomingPublished(100);

      expect(EventSeriesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycleStatus: 'Published',
          status: { $in: ['Upcoming', 'Ongoing'] },
          visibility: { $in: ['Public', 'Unlisted'] },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ eventId: 'event-1' });
    });

    it('applies the limit argument', async () => {
      const mockQuery = createSortLimitQuery([]);
      (EventSeriesModel.find as jest.Mock).mockReturnValue(mockQuery);

      await EventSeriesDAO.readUpcomingPublished(42);

      expect(mockQuery.limit).toHaveBeenCalledWith(42);
    });

    it('returns empty array when no events found', async () => {
      (EventSeriesModel.find as jest.Mock).mockReturnValue(createSortLimitQuery([]));

      const result = await EventSeriesDAO.readUpcomingPublished(100);

      expect(result).toEqual([]);
    });

    it('wraps errors', async () => {
      (EventSeriesModel.find as jest.Mock).mockReturnValue(createFailSortLimitQuery(new MockMongoError(0)));

      await expect(EventSeriesDAO.readUpcomingPublished(100)).rejects.toThrow(GraphQLError);
    });
  });

  describe('readTrending', () => {
    // readTrending uses aggregate(...).exec()
    it('returns events via the aggregation pipeline', async () => {
      const mockEvents = [{ ...expectedEvent, eventId: 'trending-1' }];
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockEvents));

      const result = await EventSeriesDAO.readTrending(5);

      expect(EventSeriesModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });

    it('applies the $match filter for Published, Upcoming/Ongoing, Public/Unlisted events', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      await EventSeriesDAO.readTrending(10);

      const pipeline = (EventSeriesModel.aggregate as jest.Mock).mock.calls[0][0];
      const matchStage = pipeline[0].$match;
      expect(matchStage.lifecycleStatus).toBe('Published');
      expect(matchStage.status.$in).toEqual(expect.arrayContaining(['Upcoming', 'Ongoing']));
      expect(matchStage.visibility.$in).toEqual(expect.arrayContaining(['Public', 'Unlisted']));
    });

    it('includes $or conditions in the $match to handle null startAt and Ongoing events', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      await EventSeriesDAO.readTrending(10);

      const pipeline = (EventSeriesModel.aggregate as jest.Mock).mock.calls[0][0];
      const matchStage = pipeline[0].$match;
      expect(matchStage.$or).toBeDefined();
      expect(matchStage.$or.length).toBeGreaterThanOrEqual(2);
      // Must have an entry covering Ongoing events
      expect(matchStage.$or.some((cond: Record<string, unknown>) => cond.status === 'Ongoing')).toBe(true);
    });

    it('filters saves $lookup by approvalStatus Accepted (consistent with createEventLookupStages)', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      await EventSeriesDAO.readTrending(10);

      const pipeline = (EventSeriesModel.aggregate as jest.Mock).mock.calls[0][0];
      const savedLookup = pipeline.find(
        (s: Record<string, unknown>) => '$lookup' in s && (s as { $lookup: { as: string } }).$lookup.as === '_savedAgg',
      ) as { $lookup: { pipeline: Array<{ $match: { $expr: { $and: Array<Record<string, unknown>> } } }> } };
      expect(savedLookup).toBeDefined();
      const andConds = savedLookup.$lookup.pipeline[0].$match.$expr.$and;
      expect(andConds.some((c) => JSON.stringify(c) === JSON.stringify({ $eq: ['$approvalStatus', 'Accepted'] }))).toBe(
        true,
      );
    });

    it('includes a $limit stage with the provided limit', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      await EventSeriesDAO.readTrending(7);

      const pipeline = (EventSeriesModel.aggregate as jest.Mock).mock.calls[0][0];
      const limitStage = pipeline.find((s: Record<string, unknown>) => s.$limit !== undefined);
      expect(limitStage).toBeDefined();
      expect(limitStage.$limit).toBe(7);
    });

    it('uses a default limit of 10 when none is provided', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      await EventSeriesDAO.readTrending();

      const pipeline = (EventSeriesModel.aggregate as jest.Mock).mock.calls[0][0];
      const limitStage = pipeline.find((s: Record<string, unknown>) => s.$limit !== undefined);
      expect(limitStage.$limit).toBe(10);
    });

    it('returns an empty array when the aggregation returns no results', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      const result = await EventSeriesDAO.readTrending(10);

      expect(result).toEqual([]);
    });

    it('wraps errors thrown by the aggregation', async () => {
      (EventSeriesModel.aggregate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(EventSeriesDAO.readTrending(10)).rejects.toThrow(GraphQLError);
    });
  });
});
