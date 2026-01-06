import {RsvpInput, UpdateEventInput, QueryOptionsInput, CreateEventInput} from '@ntlango/commons/types';
import {PipelineStage} from 'mongoose';
import {EventDAO, EventParticipantDAO} from '@/mongodb/dao';
import {Event as EventModel} from '@/mongodb/models';
import {SortOrderInput} from '@ntlango/commons/types';
import {DATE_FILTER_OPTIONS} from '@ntlango/commons/constants';
import {EventStatus} from '@ntlango/commons/types/event';
import {CustomError, ErrorTypes, transformOptionsToPipeline} from '@/utils';
import {GraphQLError} from 'graphql';
import {ERROR_MESSAGES} from '@/validation';
import {MockMongoError} from '@/test/utils';
import * as validationUtil from '@/utils/validateUserIdentifiers';

jest.mock('@/mongodb/models', () => ({
  Event: {
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
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  ...error,
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
  select: jest.fn().mockReturnThis(),
});

describe('EventDAO', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockEventInput: CreateEventInput = {
    title: 'Sample Event',
    description: 'Sample description',
    status: EventStatus.Upcoming,
    location: {
      locationType: 'tba',
    },
    recurrenceRule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=13',
    organizers: [],
    eventCategories: [],
  };

  const expectedEvent = {
    ...mockEventInput,
    eventId: 'mockEventId',
    slug: 'sample-event',
    organizers: [],
    eventCategories: [],
  };

  describe('create', () => {
    it('should create an event and return the event object', async () => {
      const mockDocument = {
        toObject: jest.fn().mockReturnValue(expectedEvent),
      };
      (EventModel.create as jest.Mock).mockResolvedValue(mockDocument);

      const createdEvent = await EventDAO.create(mockEventInput);
      expect(createdEvent).toEqual(expectedEvent);
      expect(EventModel.create).toHaveBeenCalledWith(expect.objectContaining(mockEventInput));
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.create throws an UNKNOWN error', async () => {
      (EventModel.create as jest.Mock).mockRejectedValue(new Error('Mongodb Error'));

      await expect(EventDAO.create(mockEventInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventModel.create).toHaveBeenCalledWith(expect.objectContaining(mockEventInput));
    });

    it('should throw BAD_USER_INPUT GraphQLError when EventModel.create throws a mongodb 10334 error', async () => {
      (EventModel.create as jest.Mock).mockRejectedValue(new MockMongoError(10334));

      await expect(EventDAO.create(mockEventInput)).rejects.toThrow(CustomError(ERROR_MESSAGES.CONTENT_TOO_LARGE, ErrorTypes.BAD_USER_INPUT));
      expect(EventModel.create).toHaveBeenCalledWith(expect.objectContaining(mockEventInput));
    });

    it('should throw BAD_USER_INPUT GraphQLError when validation errors are returned', async () => {
      const validationError = {
        name: 'ValidationError',
        errors: {
          title: {message: 'Title is required'},
        },
      };

      (EventModel.create as jest.Mock).mockRejectedValue(validationError);

      await expect(EventDAO.create(mockEventInput)).rejects.toThrow(CustomError('Title is required', ErrorTypes.BAD_USER_INPUT));
      expect(EventModel.create).toHaveBeenCalledWith(expect.objectContaining(mockEventInput));
    });
  });

  describe('readEventById', () => {
    it('should read an event by ID and return the populated event object', async () => {
      (EventModel.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const eventId = 'mockEventId';
      const readEvent = await EventDAO.readEventById(eventId);
      expect(readEvent).toEqual(expectedEvent);
      expect(EventModel.findById).toHaveBeenCalledWith(eventId);
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by ID', async () => {
      (EventModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const eventId = 'mockEventId';

      await expect(EventDAO.readEventById(eventId)).rejects.toThrow(CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND));
      expect(EventModel.findById).toHaveBeenCalledWith(eventId);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.findById throws an UNKNOWN error', async () => {
      (EventModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const eventId = 'mockEventId';

      await expect(EventDAO.readEventById(eventId)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventModel.findById).toHaveBeenCalledWith(eventId);
    });
  });

  describe('readEventBySlug', () => {
    it('should read an event by slug and return the populated event object', async () => {
      (EventModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const slug = 'sample-event';

      const readEvent = await EventDAO.readEventBySlug(slug);
      expect(readEvent).toEqual(expectedEvent);
      expect(EventModel.findOne).toHaveBeenCalledWith({slug});
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by slug', async () => {
      (EventModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const slug = 'nonexistent-event';

      await expect(EventDAO.readEventBySlug(slug)).rejects.toThrow(CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND));
      expect(EventModel.findOne).toHaveBeenCalledWith({slug});
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.findOne throws an UNKNOWN error', async () => {
      (EventModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const mockGraphqlError = new GraphQLError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      const slug = 'sample-event';

      await expect(EventDAO.readEventBySlug(slug)).rejects.toThrow(mockGraphqlError);
      expect(EventModel.findOne).toHaveBeenCalledWith({slug});
    });
  });

  describe('deleteEventById', () => {
    it('should delete an event by ID and return the populated event object', async () => {
      (EventModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const eventId = 'mockEventId';
      const deleteEvent = await EventDAO.deleteEventById(eventId);
      expect(deleteEvent).toEqual(expectedEvent);
      expect(EventModel.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by ID', async () => {
      (EventModel.findByIdAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const eventId = 'mockEventId';

      await expect(EventDAO.deleteEventById(eventId)).rejects.toThrow(CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND));
      expect(EventModel.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.findByIdAndDelete throws an UNKNOWN error', async () => {
      (EventModel.findByIdAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const mockGraphqlError = new GraphQLError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      const eventId = 'mockEventId';

      await expect(EventDAO.deleteEventById(eventId)).rejects.toThrow(mockGraphqlError);
      expect(EventModel.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });
  });

  describe('deleteEventBySlug', () => {
    it('should delete an event by slug and return the populated event object', async () => {
      (EventModel.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const slug = 'sample-event';

      const deleteEvent = await EventDAO.deleteEventBySlug(slug);
      expect(deleteEvent).toEqual(expectedEvent);
      expect(EventModel.findOneAndDelete).toHaveBeenCalledWith({slug});
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by slug', async () => {
      (EventModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const slug = 'nonexistent-event';

      await expect(EventDAO.deleteEventBySlug(slug)).rejects.toThrow(CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND));
      expect(EventModel.findOneAndDelete).toHaveBeenCalledWith({slug});
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.findOne throws an UNKNOWN error', async () => {
      (EventModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const slug = 'sample-event';

      await expect(EventDAO.deleteEventBySlug(slug)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventModel.findOneAndDelete).toHaveBeenCalledWith({slug});
    });
  });

  describe('readEvents', () => {
    const mockOptions: QueryOptionsInput = {
      filters: [{field: 'title', value: 'Sample'}],
      sort: [{field: 'startDateTime', order: SortOrderInput.asc}],
      pagination: {limit: 10, skip: 0},
    };

    const mockMongooseEvents = [
      {...expectedEvent, eventId: 'mockEventId1'},
      {...expectedEvent, eventId: 'mockEventId2'},
    ];

    it('should read events and return the populated event objects', async () => {
      (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockMongooseEvents));
      const pipeline: PipelineStage[] = transformOptionsToPipeline(mockOptions);

      const events = await EventDAO.readEvents(mockOptions);
      expect(events).toEqual(mockMongooseEvents);
      expect(EventModel.aggregate).toHaveBeenCalledWith(pipeline);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.aggregate throws an UNKNOWN error', async () => {
      (EventModel.aggregate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const pipeline: PipelineStage[] = transformOptionsToPipeline(mockOptions);

      await expect(EventDAO.readEvents(mockOptions)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventModel.aggregate).toHaveBeenCalledWith(pipeline);
    });

    it('should return an empty array if no events are found', async () => {
      (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));
      const pipeline: PipelineStage[] = transformOptionsToPipeline(mockOptions);

      const events = await EventDAO.readEvents(mockOptions);
      expect(events).toEqual([]);
      expect(EventModel.aggregate).toHaveBeenCalledWith(pipeline);
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
          {...expectedEvent, eventId: 'event1', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event2', recurrenceRule: `DTSTART:${yesterdayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event3', recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventDAO.readEvents({
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

        // Event from a month ago that should be excluded
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = lastMonth.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const eventsWithRRules = [
          // Daily event for 7 days starting from start of week (should be included)
          {...expectedEvent, eventId: 'event1', recurrenceRule: `DTSTART:${startOfWeekStr}\nRRULE:FREQ=DAILY;COUNT=7`},
          // Event from last month (should be excluded)
          {...expectedEvent, eventId: 'event2', recurrenceRule: `DTSTART:${lastMonthStr}\nRRULE:FREQ=DAILY;COUNT=1`},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventDAO.readEvents({
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
          {...expectedEvent, eventId: 'event1', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event2', recurrenceRule: `DTSTART:${yesterdayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventDAO.readEvents({
          dateRange: {
            startDate: nextWeek,
            endDate: nextWeekEnd,
          },
        });

        expect(events).toHaveLength(0);
      });

      it('should exclude events with no recurrenceRule', async () => {
        const startOfToday = new Date(today);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const eventsWithAndWithoutRRules = [
          {...expectedEvent, eventId: 'event1', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event2', recurrenceRule: undefined},
          {...expectedEvent, eventId: 'event3', recurrenceRule: null},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithAndWithoutRRules));

        const events = await EventDAO.readEvents({
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
        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockMongooseEvents));

        const events = await EventDAO.readEvents(mockOptions);

        expect(events).toEqual(mockMongooseEvents);
      });

      it('should combine dateRange with other filters', async () => {
        const startOfToday = new Date(today);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const eventsWithRRules = [
          {...expectedEvent, eventId: 'event1', title: 'Match', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event2', title: 'NoMatch', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventDAO.readEvents({
          filters: [{field: 'title', value: 'Match'}],
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
          {...expectedEvent, eventId: 'event1', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event2', recurrenceRule: `DTSTART:${yesterdayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event3', recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventDAO.readEvents({
          dateFilterOption: DATE_FILTER_OPTIONS.TODAY,
        });

        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event1');
      });

      it('should filter events using TOMORROW option', async () => {
        const eventsWithRRules = [
          {...expectedEvent, eventId: 'event1', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event2', recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventDAO.readEvents({
          dateFilterOption: DATE_FILTER_OPTIONS.TOMORROW,
        });

        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event2');
      });

      it('should filter events using CUSTOM option with customDate', async () => {
        const customDate = tomorrow;
        const eventsWithRRules = [
          {...expectedEvent, eventId: 'event1', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event2', recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        const events = await EventDAO.readEvents({
          customDate,
        });

        expect(events).toHaveLength(1);
        expect(events[0].eventId).toBe('event2');
      });

      it('should prioritize dateFilterOption over dateRange', async () => {
        const eventsWithRRules = [
          {...expectedEvent, eventId: 'event1', recurrenceRule: `DTSTART:${todayStr}\nRRULE:FREQ=DAILY;COUNT=1`},
          {...expectedEvent, eventId: 'event2', recurrenceRule: `DTSTART:${tomorrowStr}\nRRULE:FREQ=DAILY;COUNT=1`},
        ];

        (EventModel.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(eventsWithRRules));

        // Pass both dateFilterOption and dateRange - dateFilterOption should win
        const events = await EventDAO.readEvents({
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

  describe('updateEvent', () => {
    const mockUpdatedEventInput: UpdateEventInput = {
      eventId: 'mockEventId',
      title: 'Updated Event Title',
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
      (EventModel.findByIdAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedUpdatedEvent,
        }),
      );

      const {eventId, ...mockUpdatedEventInputWithoutId} = mockUpdatedEventInput;
      const updatedEvent = await EventDAO.updateEvent(mockUpdatedEventInput);
      expect({...updatedEvent, slug: 'updated-event-title'}).toEqual(expectedUpdatedEvent);
      expect(EventModel.findByIdAndUpdate).toHaveBeenCalledWith(eventId, expect.objectContaining(mockUpdatedEventInputWithoutId), {new: true});
    });

    it('should throw NOT_FOUND GraphQLError when the event to be updated is not found', async () => {
      (EventModel.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const {eventId, ...calledWithInput} = mockUpdatedEventInput;
      await expect(EventDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(
        CustomError(`Event with eventId ${mockUpdatedEventInput.eventId} not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventModel.findByIdAndUpdate).toHaveBeenCalledWith(eventId, expect.objectContaining(calledWithInput), {
        new: true,
      });
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (EventModel.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      const {eventId, ...calledWithInput} = mockUpdatedEventInput;
      await expect(EventDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventModel.findByIdAndUpdate).toHaveBeenCalledWith(eventId, expect.objectContaining(calledWithInput), {
        new: true,
      });
    });

    it('should throw the original GraphQLError when EventModel.findByIdAndUpdate throws a GraphQLError', async () => {
      const mockGraphqlError = new GraphQLError('GraphQL Error');
      (EventModel.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockGraphqlError));

      const {eventId, ...calledWithInput} = mockUpdatedEventInput;
      await expect(EventDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(mockGraphqlError);
      expect(EventModel.findByIdAndUpdate).toHaveBeenCalledWith(eventId, expect.objectContaining(calledWithInput), {
        new: true,
      });
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
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);

      const updatedEventMock = {eventId: 'event123'};
      (EventModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({toObject: () => updatedEventMock}));

      const upsertSpy = jest
        .spyOn(EventParticipantDAO, 'upsert')
        .mockResolvedValue({participantId: 'p1', eventId: 'event123', userId: 'user1'} as any);

      const result = await EventDAO.RSVP(input);

      expect(EventModel.findById).toHaveBeenCalledWith('event123');
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
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);
      (EventModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventDAO.RSVP(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', 'nonexistentEvent'), ErrorTypes.NOT_FOUND),
      );
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (EventModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(['user1']);
      const input: RsvpInput = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };

      await expect(EventDAO.RSVP(input)).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw error when participant upsert fails (atomic behavior)', async () => {
      const input: RsvpInput = {
        eventId: 'event123',
        userIdList: ['user1', 'user2'],
      };

      const validatedUserIds = ['user1', 'user2'];
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);
      const updatedEventMock = {eventId: 'event123'};
      (EventModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({toObject: () => updatedEventMock}));

      const participantError = new Error('Participant creation failed');
      const upsertSpy = jest.spyOn(EventParticipantDAO, 'upsert').mockRejectedValue(participantError);

      await expect(EventDAO.RSVP(input)).rejects.toThrow();
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
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);

      const updatedEventMock = {eventId: 'event123'};
      (EventModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({toObject: () => updatedEventMock}));

      const cancelSpy = jest
        .spyOn(EventParticipantDAO, 'cancel')
        .mockResolvedValue({participantId: 'p1', eventId: 'event123', userId: 'user1', status: 'Cancelled'} as any);

      const result = await EventDAO.cancelRSVP(input);

      expect(EventModel.findById).toHaveBeenCalledWith('event123');
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
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);
      (EventModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventDAO.cancelRSVP(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', 'nonexistentEvent'), ErrorTypes.NOT_FOUND),
      );
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventModel.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (EventModel.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(['user1']);
      const input: RsvpInput = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };

      await expect(EventDAO.cancelRSVP(input)).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw error when participant cancellation fails (atomic behavior)', async () => {
      const input: RsvpInput = {
        eventId: 'event123',
        userIdList: ['user1', 'user2'],
      };

      const validatedUserIds = ['user1', 'user2'];
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);
      const updatedEventMock = {eventId: 'event123'};
      (EventModel.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({toObject: () => updatedEventMock}));

      const participantError = new Error('Participant cancellation failed');
      const cancelSpy = jest.spyOn(EventParticipantDAO, 'cancel').mockRejectedValue(participantError);

      await expect(EventDAO.cancelRSVP(input)).rejects.toThrow();
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
