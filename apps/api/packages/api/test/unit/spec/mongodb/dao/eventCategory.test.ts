import {EventCategoryDAO} from '@/mongodb/dao';
import {EventCategory} from '@/mongodb/models';
import {EventCategoryType, CreateEventCategoryInputType, UpdateEventCategoryInputType, QueryOptionsInput} from '@/graphql/types';
import {CustomError, ErrorTypes, transformOptionsToQuery} from '@/utils';
import {ERROR_MESSAGES} from '@/validation';
import {MockMongoError} from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  EventCategory: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndDelete: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('@/utils/queries/query', () => ({
  transformOptionsToQuery: jest.fn(),
}));

const createMockSuccessMongooseQuery = <T>(result?: T) => ({
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

describe('EventCategoryDAO', () => {
  const mockEventCategory: EventCategoryType = {
    eventCategoryId: '1',
    name: 'Test Category',
    slug: 'test-category',
    description: 'A test category',
    iconName: 'mock icon name',
  };

  describe('create', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create an event category when correct input is provided', async () => {
      (EventCategory.create as jest.Mock).mockResolvedValue({
        toObject: () => mockEventCategory,
      });

      const input: CreateEventCategoryInputType = {
        name: 'Test Category',
        description: 'A test category',
        iconName: 'mock icon name',
      };
      const result = await EventCategoryDAO.create(input);

      expect(EventCategory.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockEventCategory);
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError if creation fails', async () => {
      (EventCategory.create as jest.Mock).mockImplementation(() => {
        throw new Error('Creation Error');
      });

      const input: CreateEventCategoryInputType = {
        name: 'Test Category',
        description: 'A test category',
        iconName: 'mock icon name',
      };

      await expect(EventCategoryDAO.create(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventCategory.create).toHaveBeenCalledWith(input);
    });
  });

  describe('readEventCategoryById', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should read an event category by id', async () => {
      (EventCategory.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockEventCategory,
        }),
      );

      const result = await EventCategoryDAO.readEventCategoryById('1');

      expect(EventCategory.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEventCategory);
    });

    it('should throw NOT_FOUND GraphQLError if event category not found', async () => {
      (EventCategory.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      await expect(EventCategoryDAO.readEventCategoryById('1')).rejects.toThrow(
        CustomError(`Event Category with eventCategoryId 1 does not exist`, ErrorTypes.NOT_FOUND),
      );
      expect(EventCategory.findById).toHaveBeenCalledWith('1');
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventCategory.findById throws an UNKNOWN error', async () => {
      (EventCategory.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const eventCategoryId = 'mockEventCategoryId';

      await expect(EventCategoryDAO.readEventCategoryById(eventCategoryId)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventCategory.findById).toHaveBeenCalledWith(eventCategoryId);
    });
  });

  describe('readEventCategoryBySlug', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should read an event category by slug', async () => {
      (EventCategory.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockEventCategory,
        }),
      );
      const result = await EventCategoryDAO.readEventCategoryBySlug('test-category');

      expect(EventCategory.findOne).toHaveBeenCalledWith({slug: 'test-category'});
      expect(result).toEqual(mockEventCategory);
    });

    it('should throw NOT_FOUND GraphQLError if event category not found', async () => {
      (EventCategory.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventCategoryDAO.readEventCategoryBySlug('test-category')).rejects.toThrow(
        CustomError(`Event Category with slug test-category not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventCategory.findOne).toHaveBeenCalledWith({slug: 'test-category'});
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventCategory.findOne throws an UNKNOWN error', async () => {
      (EventCategory.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const eventCategorySlug = 'mockEventCategorySlug';

      await expect(EventCategoryDAO.readEventCategoryBySlug(eventCategorySlug)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventCategory.findOne).toHaveBeenCalledWith({slug: eventCategorySlug});
    });
  });

  describe('readEventCategories', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should read event categories with options', async () => {
      (EventCategory.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockEventCategory,
          },
        ]),
      );
      (transformOptionsToQuery as jest.Mock).mockReturnValue(EventCategory.find());
      const options: QueryOptionsInput = {
        pagination: {limit: 10, skip: 0},
      };

      const result = await EventCategoryDAO.readEventCategories(options);

      expect(transformOptionsToQuery).toHaveBeenCalledWith(EventCategory, options);
      expect(result).toEqual([mockEventCategory]);
    });

    it('should read event categories without options', async () => {
      (EventCategory.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockEventCategory,
          },
        ]),
      );

      const result = await EventCategoryDAO.readEventCategories();

      expect(EventCategory.find).toHaveBeenCalledWith({});
      expect(result).toEqual([mockEventCategory]);
    });

    it('should throw an error if query fails', async () => {
      (EventCategory.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new Error('Query Error')));

      await expect(EventCategoryDAO.readEventCategories()).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventCategory.find).toHaveBeenCalledWith({});
    });
  });

  describe('updateEventCategory', () => {
    it('should update an event category', async () => {
      (EventCategory.findByIdAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockEventCategory,
        }),
      );

      const input: UpdateEventCategoryInputType = {eventCategoryId: '1', name: 'Updated Category'};
      const result = await EventCategoryDAO.updateEventCategory(input);

      expect(EventCategory.findByIdAndUpdate).toHaveBeenCalledWith('1', input, {new: true});
      expect(result).toEqual(mockEventCategory);
    });

    it('should throw NOT_FOUND GraphQLError when the event category to be updated is not found', async () => {
      (EventCategory.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (EventCategory.create as jest.Mock).mockRejectedValue(new Error('Creation Error'));

      const input: UpdateEventCategoryInputType = {eventCategoryId: '1', name: 'Updated Category'};

      await expect(EventCategoryDAO.updateEventCategory(input)).rejects.toThrow(CustomError('Event Category not found', ErrorTypes.NOT_FOUND));
      expect(EventCategory.findByIdAndUpdate).toHaveBeenCalledWith('1', input, {new: true});
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventCategory.findByIdAndUpdate throws an UNKNOWN error', async () => {
      (EventCategory.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new Error('Update Error')));

      const input: UpdateEventCategoryInputType = {eventCategoryId: '1', name: 'Updated Category'};

      await expect(EventCategoryDAO.updateEventCategory(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventCategory.findByIdAndUpdate).toHaveBeenCalledWith('1', input, {new: true});
    });
  });

  describe('deleteEventCategoryById', () => {
    it('should delete an event category by eventCategoryId', async () => {
      (EventCategory.findByIdAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockEventCategory,
        }),
      );
      const result = await EventCategoryDAO.deleteEventCategoryById('1');

      expect(EventCategory.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEventCategory);
    });

    it('should throw NOT_FOUND GraphQLError if event category to be deleted does not exist', async () => {
      (EventCategory.findByIdAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventCategoryDAO.deleteEventCategoryById('1')).rejects.toThrow(
        CustomError(`Event Category with eventCategoryId 1 not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventCategory.findByIdAndDelete).toHaveBeenCalledWith('1');
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventCategory.findByIdAndDelete throws an UNKNOWN error', async () => {
      (EventCategory.findByIdAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const eventCategoryId = 'mockEventCategoryId';

      await expect(EventCategoryDAO.deleteEventCategoryById(eventCategoryId)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventCategory.findByIdAndDelete).toHaveBeenCalledWith(eventCategoryId);
    });
  });

  describe('deleteEventCategoryBySlug', () => {
    it('should delete an event category by eventCategoryId', async () => {
      (EventCategory.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockEventCategory,
        }),
      );
      const result = await EventCategoryDAO.deleteEventCategoryBySlug('mockSlug');

      expect(EventCategory.findOneAndDelete).toHaveBeenCalledWith({slug: 'mockSlug'});
      expect(result).toEqual(mockEventCategory);
    });

    it('should throw NOT_FOUND GraphQLError if event category to be deleted does not exist', async () => {
      (EventCategory.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventCategoryDAO.deleteEventCategoryBySlug('mockSlug')).rejects.toThrow(
        CustomError(`Event Category with slug mockSlug not found`, ErrorTypes.NOT_FOUND),
      );
      expect(EventCategory.findOneAndDelete).toHaveBeenCalledWith({slug: 'mockSlug'});
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when EventCategory.findOneAndDelete throws an UNKNOWN error', async () => {
      (EventCategory.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));
      const eventCategoryId = 'mockEventCategoryId';

      await expect(EventCategoryDAO.deleteEventCategoryBySlug(eventCategoryId)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
      expect(EventCategory.findOneAndDelete).toHaveBeenCalledWith({slug: eventCategoryId});
    });
  });
});
