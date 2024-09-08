import {EventDAO} from '@/mongodb/dao';
import {Event} from '@/mongodb/models';
import {EventType, RSVPInputType, SortOrderInput, UpdateEventCategoryInputType, UpdateEventInputType} from '@/graphql/types';
import {CustomError, ErrorTypes, transformOptionsToPipeline} from '@/utils';
import {QueryOptionsInput, CreateEventInputType, EventStatus} from '@/graphql/types';
import {GraphQLError} from 'graphql';
import {ERROR_MESSAGES} from '@/validation';
import {PipelineStage} from 'mongoose';
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

  const mockEventInput: CreateEventInputType = {
    title: 'Sample Event',
    description: 'Sample description',
    status: EventStatus.Upcoming,
    location: {
      locationType: 'tba',
    },
    recurrenceRule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=13',
    organizerList: [],
    rSVPList: [],
    eventCategoryList: [],
  };

  const expectedEvent = {
    ...mockEventInput,
    eventId: 'mockEventId',
    slug: 'sample-event',
    organizerList: [],
    rSVPList: [],
    eventCategoryList: [],
  };

  describe('create', () => {
    it('should create an event and return the populated event object', async () => {
      const mockedPopulate = {
        populate: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue(expectedEvent),
        }),
      };
      (Event.create as jest.Mock).mockResolvedValue(mockedPopulate);

      const createdEvent = await EventDAO.create(mockEventInput);
      expect(createdEvent).toEqual(expectedEvent);
      expect(Event.create).toHaveBeenCalledWith(expect.objectContaining(mockEventInput));
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.create throws an UNKNOWN error', async () => {
      (Event.create as jest.Mock).mockRejectedValue(new Error('Mongodb Error'));

      await expect(EventDAO.create(mockEventInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(Event.create).toHaveBeenCalledWith(expect.objectContaining(mockEventInput));
    });

    it('should throw BAD_USER_INPUT GraphQLError when Event.create throws a mongodb 10334 error', async () => {
      (Event.create as jest.Mock).mockRejectedValue(new MockMongoError(10334));

      await expect(EventDAO.create(mockEventInput)).rejects.toThrow(CustomError(ERROR_MESSAGES.CONTENT_TOO_LARGE, ErrorTypes.BAD_USER_INPUT));
      expect(Event.create).toHaveBeenCalledWith(expect.objectContaining(mockEventInput));
    });
  });

  describe('readEventById', () => {
    it('should read an event by ID and return the populated event object', async () => {
      (Event.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const eventId = 'mockEventId';
      const readEvent = await EventDAO.readEventById(eventId);
      expect(readEvent).toEqual(expectedEvent);
      expect(Event.findById).toHaveBeenCalledWith(eventId);
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by ID', async () => {
      (Event.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const eventId = 'mockEventId';

      await expect(EventDAO.readEventById(eventId)).rejects.toThrow(CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND));
      expect(Event.findById).toHaveBeenCalledWith(eventId);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.findById throws an UNKNOWN error', async () => {
      (Event.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const eventId = 'mockEventId';

      await expect(EventDAO.readEventById(eventId)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(Event.findById).toHaveBeenCalledWith(eventId);
    });
  });

  describe('readEventBySlug', () => {
    it('should read an event by slug and return the populated event object', async () => {
      (Event.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const slug = 'sample-event';

      const readEvent = await EventDAO.readEventBySlug(slug);
      expect(readEvent).toEqual(expectedEvent);
      expect(Event.findOne).toHaveBeenCalledWith({slug});
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by slug', async () => {
      (Event.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const slug = 'nonexistent-event';

      await expect(EventDAO.readEventBySlug(slug)).rejects.toThrow(CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND));
      expect(Event.findOne).toHaveBeenCalledWith({slug});
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.findOne throws an UNKNOWN error', async () => {
      (Event.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const mockGraphqlError = new GraphQLError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      const slug = 'sample-event';

      await expect(EventDAO.readEventBySlug(slug)).rejects.toThrow(mockGraphqlError);
      expect(Event.findOne).toHaveBeenCalledWith({slug});
    });
  });

  describe('deleteEventById', () => {
    it('should delete an event by ID and return the populated event object', async () => {
      (Event.findByIdAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const eventId = 'mockEventId';
      const deleteEvent = await EventDAO.deleteEventById(eventId);
      expect(deleteEvent).toEqual(expectedEvent);
      expect(Event.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by ID', async () => {
      (Event.findByIdAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const eventId = 'mockEventId';

      await expect(EventDAO.deleteEventById(eventId)).rejects.toThrow(CustomError(`Event with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND));
      expect(Event.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.findByIdAndDelete throws an UNKNOWN error', async () => {
      (Event.findByIdAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const mockGraphqlError = new GraphQLError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      const eventId = 'mockEventId';

      await expect(EventDAO.deleteEventById(eventId)).rejects.toThrow(mockGraphqlError);
      expect(Event.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });
  });

  describe('deleteEventBySlug', () => {
    it('should delete an event by slug and return the populated event object', async () => {
      (Event.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedEvent,
        }),
      );

      const slug = 'sample-event';

      const deleteEvent = await EventDAO.deleteEventBySlug(slug);
      expect(deleteEvent).toEqual(expectedEvent);
      expect(Event.findOneAndDelete).toHaveBeenCalledWith({slug});
    });

    it('should throw NOT_FOUND GraphQLError when event is not found by slug', async () => {
      (Event.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      const slug = 'nonexistent-event';

      await expect(EventDAO.deleteEventBySlug(slug)).rejects.toThrow(CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND));
      expect(Event.findOneAndDelete).toHaveBeenCalledWith({slug});
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.findOne throws an UNKNOWN error', async () => {
      (Event.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const slug = 'sample-event';

      await expect(EventDAO.deleteEventBySlug(slug)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(Event.findOneAndDelete).toHaveBeenCalledWith({slug});
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
      (Event.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockMongooseEvents));
      const pipeline: PipelineStage[] = transformOptionsToPipeline(mockOptions);

      const events = await EventDAO.readEvents(mockOptions);
      expect(events).toEqual(mockMongooseEvents);
      expect(Event.aggregate).toHaveBeenCalledWith(pipeline);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.aggregate throws an UNKNOWN error', async () => {
      (Event.aggregate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const pipeline: PipelineStage[] = transformOptionsToPipeline(mockOptions);

      await expect(EventDAO.readEvents(mockOptions)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(Event.aggregate).toHaveBeenCalledWith(pipeline);
    });

    it('should return an empty array if no events are found', async () => {
      (Event.aggregate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));
      const pipeline: PipelineStage[] = transformOptionsToPipeline(mockOptions);

      const events = await EventDAO.readEvents(mockOptions);
      expect(events).toEqual([]);
      expect(Event.aggregate).toHaveBeenCalledWith(pipeline);
    });
  });

  describe('updateEvent', () => {
    const mockUpdatedEventInput: UpdateEventInputType = {
      eventId: 'mockEventId',
      title: 'Updated Event Title',
      description: 'Updated description',
      status: EventStatus.Ongoing,
      location: {
        locationType: 'online',
        details: 'updated location',
      },
      organizerList: [],
      rSVPList: [],
      eventCategoryList: [],
    };

    const expectedUpdatedEvent = {
      ...mockUpdatedEventInput,
      slug: 'updated-event-title',
    };

    it('should update an event and return the populated event object', async () => {
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => expectedUpdatedEvent,
        }),
      );

      const {eventId, ...mockUpdatedEventInputWithoutId} = mockUpdatedEventInput;
      const updatedEvent = await EventDAO.updateEvent(mockUpdatedEventInput);
      expect({...updatedEvent, slug: 'updated-event-title'}).toEqual(expectedUpdatedEvent);
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(eventId, expect.objectContaining(mockUpdatedEventInputWithoutId), {new: true});
    });

    it('should throw NOT_FOUND GraphQLError when the event to be updated is not found', async () => {
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const {eventId, ...calledWithInput} = mockUpdatedEventInput;
      await expect(EventDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(
        CustomError(`Event with eventId ${mockUpdatedEventInput.eventId} not found`, ErrorTypes.NOT_FOUND),
      );
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(eventId, expect.objectContaining(calledWithInput), {
        new: true,
      });
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      const {eventId, ...calledWithInput} = mockUpdatedEventInput;
      await expect(EventDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(eventId, expect.objectContaining(calledWithInput), {
        new: true,
      });
    });

    it('should throw the original GraphQLError when Event.findByIdAndUpdate throws a GraphQLError', async () => {
      const mockGraphqlError = new GraphQLError('GraphQL Error');
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockGraphqlError));

      const {eventId, ...calledWithInput} = mockUpdatedEventInput;
      await expect(EventDAO.updateEvent(mockUpdatedEventInput)).rejects.toThrow(mockGraphqlError);
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(eventId, expect.objectContaining(calledWithInput), {
        new: true,
      });
    });
  });

  describe('RSVP', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should RSVP users successfully', async () => {
      const input: RSVPInputType = {
        eventId: 'event123',
        userIdList: ['user1', 'user2'],
        usernameList: ['username1', 'username2'],
        emailList: ['email1@example.com'],
      };

      const validatedUserIds = ['user1', 'user2', 'username1', 'username2', 'email1'];
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);

      const updatedEventMock = {
        eventId: 'event123',
        rSVPList: validatedUserIds,
      };
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => updatedEventMock,
        }),
      );

      const result = await EventDAO.RSVP(input);

      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
        'event123',
        {
          $addToSet: {
            rSVPList: {$each: validatedUserIds},
          },
        },
        {new: true},
      );

      expect(result).toEqual(updatedEventMock);
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw NOT_FOUND GraphQLError when the event to RSVP users for is not found', async () => {
      const input: RSVPInputType = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };
      const validatedUserIds = ['user1'];
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventDAO.RSVP(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', 'nonexistentEvent'), ErrorTypes.NOT_FOUND),
      );
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(['user1']);
      const input: RSVPInputType = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };

      const updateQuery = {
        $addToSet: {
          rSVPList: {
            $each: ['user1'],
          },
        },
      };

      await expect(EventDAO.RSVP(input)).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith('nonexistentEvent', updateQuery, {new: true});

      await expect(EventDAO.RSVP(input)).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });
  });

  describe('cancelRSVP', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should cancelRSVP users successfully', async () => {
      const input: RSVPInputType = {
        eventId: 'event123',
        userIdList: ['user1', 'user2'],
        usernameList: ['username1', 'username2'],
        emailList: ['email1@example.com'],
      };

      const validatedUserIds = ['user1', 'user2', 'username1', 'username2', 'email1'];
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);

      const updatedEventMock = {
        eventId: 'event123',
        rSVPList: [],
      };
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => updatedEventMock,
        }),
      );

      const result = await EventDAO.cancelRSVP(input);

      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
        'event123',
        {
          $pull: {
            rSVPList: {$in: validatedUserIds},
          },
        },
        {new: true},
      );

      expect(result).toEqual(updatedEventMock);
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw NOT_FOUND GraphQLError when the event to cancel RSVP users is not found', async () => {
      const input: RSVPInputType = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };
      const validatedUserIds = ['user1'];
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(validatedUserIds);
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventDAO.cancelRSVP(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('Event', 'ID', 'nonexistentEvent'), ErrorTypes.NOT_FOUND),
      );
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when Event.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (Event.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const validateUserIdentifiersSpy = jest.spyOn(validationUtil, 'validateUserIdentifiers').mockResolvedValue(['user1']);
      const input: RSVPInputType = {
        eventId: 'nonexistentEvent',
        userIdList: ['user1'],
      };

      const updateQuery = {
        $pull: {
          rSVPList: {
            $in: ['user1'],
          },
        },
      };

      await expect(EventDAO.cancelRSVP(input)).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith('nonexistentEvent', updateQuery, {new: true});

      await expect(EventDAO.RSVP(input)).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
      expect(validateUserIdentifiersSpy).toHaveBeenCalledWith(input);
    });
  });
});
