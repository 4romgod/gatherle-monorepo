import {EventCategoryGroupDAO} from '@/mongodb/dao';
import {EventCategoryGroup as EventCategoryGroupModel} from '@/mongodb/models';
import type {EventCategoryGroup, CreateEventCategoryGroupInput, UpdateEventCategoryGroupInput, QueryOptionsInput} from '@ntlango/commons/types';
import {SortOrderInput} from '@ntlango/commons/types';
import {CustomError, ErrorTypes, transformOptionsToQuery} from '@/utils';
import {ERROR_MESSAGES} from '@/validation';
import {MockMongoError} from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  EventCategoryGroup: {
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

describe('EventCategoryGroupDAO', () => {
  const mockEventCategoryIds = ['cat-1', 'cat-2', 'cat-3'];
  const mockPopulatedCategories = [
    {
      eventCategoryId: 'cat-1',
      name: 'Category 1',
      slug: 'category-1',
      description: 'First category',
      iconName: 'icon-1',
    },
    {
      eventCategoryId: 'cat-2',
      name: 'Category 2',
      slug: 'category-2',
      description: 'Second category',
      iconName: 'icon-2',
    },
    {
      eventCategoryId: 'cat-3',
      name: 'Category 3',
      slug: 'category-3',
      description: 'Third category',
      iconName: 'icon-3',
    },
  ];

  const mockEventCategoryGroup: EventCategoryGroup = {
    eventCategoryGroupId: '1',
    name: 'Test Group',
    slug: 'test-group',
    eventCategories: mockPopulatedCategories as any,
  };

  describe('create', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create event category group and populate eventCategories', async () => {
      const input: CreateEventCategoryGroupInput = {
        name: 'Test Group',
        eventCategories: mockEventCategoryIds,
      };

      const mockCreatedDocument = {
        ...mockEventCategoryGroup,
        eventCategories: mockEventCategoryIds,
        toObject: jest.fn().mockReturnValue({
          ...mockEventCategoryGroup,
          eventCategories: mockEventCategoryIds,
        }),
      };

      (EventCategoryGroupModel.create as jest.Mock).mockResolvedValue(mockCreatedDocument);

      const result = await EventCategoryGroupDAO.create(input);

      expect(EventCategoryGroupModel.create).toHaveBeenCalledWith(input);
      expect(result.eventCategories).toEqual(mockEventCategoryIds);
      expect(result.eventCategories).toHaveLength(mockEventCategoryIds.length);

      // EventCategories are now just IDs, not populated objects
      result.eventCategories.forEach((categoryId: any) => {
        expect(typeof categoryId).toBe('string');
      });
    });

    it('should handle errors during creation', async () => {
      const input: CreateEventCategoryGroupInput = {
        name: 'Test Group',
        eventCategories: mockEventCategoryIds,
      };

      const mongoError = new MockMongoError(11000, 'Duplicate key error');
      (EventCategoryGroupModel.create as jest.Mock).mockRejectedValue(mongoError);

      await expect(EventCategoryGroupDAO.create(input)).rejects.toThrow();
    });
  });

  describe('readEventCategoryGroupBySlug', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should read event category group by slug and populate eventCategories', async () => {
      const slug = 'test-group';
      const mockQuery = createMockSuccessMongooseQuery({
        ...mockEventCategoryGroup,
        toObject: jest.fn().mockReturnValue(mockEventCategoryGroup),
      });

      (EventCategoryGroupModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await EventCategoryGroupDAO.readEventCategoryGroupBySlug(slug);

      expect(EventCategoryGroupModel.findOne).toHaveBeenCalledWith({slug});
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockEventCategoryGroup);
    });

    it('should throw NOT_FOUND error when group does not exist', async () => {
      const slug = 'non-existent-group';
      const mockQuery = createMockSuccessMongooseQuery(null);

      (EventCategoryGroupModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      await expect(EventCategoryGroupDAO.readEventCategoryGroupBySlug(slug)).rejects.toThrow(
        CustomError(`Event Category Group with slug ${slug} not found`, ErrorTypes.NOT_FOUND),
      );
    });

    it('should wrap unknown errors', async () => {
      const slug = 'test-group';
      const mockQuery = createMockFailedMongooseQuery(new MockMongoError(0));

      (EventCategoryGroupModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      await expect(EventCategoryGroupDAO.readEventCategoryGroupBySlug(slug)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readEventCategoryGroups', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should read all event category groups and populate eventCategories', async () => {
      const mockGroups = [mockEventCategoryGroup];
      const mockQuery = createMockSuccessMongooseQuery(
        mockGroups.map((group) => ({
          ...group,
          toObject: jest.fn().mockReturnValue(group),
        })),
      );

      (EventCategoryGroupModel.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await EventCategoryGroupDAO.readEventCategoryGroups();

      expect(EventCategoryGroupModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockGroups);
    });

    it('should read event category groups with options and populate eventCategories', async () => {
      const options: QueryOptionsInput = {
        filters: [{field: 'name', value: 'Test Group'}],
        sort: [{field: 'name', order: SortOrderInput.asc}],
        pagination: {skip: 0, limit: 10},
      };

      const mockGroups = [mockEventCategoryGroup];
      const mockQuery = createMockSuccessMongooseQuery(
        mockGroups.map((group) => ({
          ...group,
          toObject: jest.fn().mockReturnValue(group),
        })),
      );

      (transformOptionsToQuery as jest.Mock).mockReturnValue(mockQuery);

      const result = await EventCategoryGroupDAO.readEventCategoryGroups(options);

      expect(transformOptionsToQuery).toHaveBeenCalledWith(EventCategoryGroupModel, options);
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockGroups);
    });

    it('should handle errors when reading groups', async () => {
      const mockQuery = createMockFailedMongooseQuery(new MockMongoError(0));

      (EventCategoryGroupModel.find as jest.Mock).mockReturnValue(mockQuery);

      await expect(EventCategoryGroupDAO.readEventCategoryGroups()).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('updateEventCategoryGroup', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update event category group and populate eventCategories', async () => {
      const input: UpdateEventCategoryGroupInput = {
        eventCategoryGroupId: '1',
        name: 'Updated Group',
        eventCategories: mockEventCategoryIds,
      };

      const mockQuery = createMockSuccessMongooseQuery({
        ...mockEventCategoryGroup,
        name: 'Updated Group',
        toObject: jest.fn().mockReturnValue({...mockEventCategoryGroup, name: 'Updated Group'}),
      });

      (EventCategoryGroupModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      const result = await EventCategoryGroupDAO.updateEventCategoryGroup(input);

      expect(EventCategoryGroupModel.findByIdAndUpdate).toHaveBeenCalledWith(input.eventCategoryGroupId, input, {
        new: true,
      });
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result.name).toBe('Updated Group');
    });

    it('should throw NOT_FOUND error when updating non-existent group', async () => {
      const input: UpdateEventCategoryGroupInput = {
        eventCategoryGroupId: 'non-existent',
        name: 'Updated Group',
        eventCategories: mockEventCategoryIds,
      };

      const mockQuery = createMockSuccessMongooseQuery(null);
      (EventCategoryGroupModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      await expect(EventCategoryGroupDAO.updateEventCategoryGroup(input)).rejects.toThrow(
        CustomError('Event Category Group not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('should wrap unknown errors when updating', async () => {
      const input: UpdateEventCategoryGroupInput = {
        eventCategoryGroupId: '1',
        name: 'Updated Group',
        eventCategories: mockEventCategoryIds,
      };

      const mockQuery = createMockFailedMongooseQuery(new MockMongoError(0));
      (EventCategoryGroupModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      await expect(EventCategoryGroupDAO.updateEventCategoryGroup(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('deleteEventCategoryGroupBySlug', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should delete event category group by slug', async () => {
      const slug = 'test-group';
      const mockQuery = createMockSuccessMongooseQuery({
        ...mockEventCategoryGroup,
        toObject: jest.fn().mockReturnValue(mockEventCategoryGroup),
      });

      (EventCategoryGroupModel.findOneAndDelete as jest.Mock).mockReturnValue(mockQuery);

      const result = await EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(slug);

      expect(EventCategoryGroupModel.findOneAndDelete).toHaveBeenCalledWith({slug});
      expect(result).toEqual(mockEventCategoryGroup);
    });

    it('should throw NOT_FOUND error when deleting non-existent group', async () => {
      const slug = 'missing-group';
      const mockQuery = createMockSuccessMongooseQuery(null);

      (EventCategoryGroupModel.findOneAndDelete as jest.Mock).mockReturnValue(mockQuery);

      await expect(EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(slug)).rejects.toThrow(
        CustomError(`Event Category Group with slug ${slug} not found`, ErrorTypes.NOT_FOUND),
      );
    });

    it('should wrap unknown errors when deleting', async () => {
      const slug = 'test-group';
      const mockQuery = createMockFailedMongooseQuery(new MockMongoError(0));

      (EventCategoryGroupModel.findOneAndDelete as jest.Mock).mockReturnValue(mockQuery);

      await expect(EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(slug)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
