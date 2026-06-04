import 'reflect-metadata';
import { EventCategoryResolver } from '@/graphql/resolvers/eventCategory';
import type { CreateEventCategoryInput, EventCategory } from '@gatherle/commons/server/types';
import { UserRole } from '@gatherle/commons/server/types';
import * as validation from '@/validation';
import type { ServerContext } from '@/graphql';
import EventCategoryService from '@/services/eventCategory';

jest.mock('@/services/eventCategory', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    deleteById: jest.fn(),
    deleteBySlug: jest.fn(),
  },
}));

jest.mock('@/mongodb/dao', () => ({
  EventCategoryDAO: {
    updateEventCategory: jest.fn(),
    readEventCategoryById: jest.fn(),
    readEventCategoryBySlug: jest.fn(),
    readEventCategories: jest.fn(),
  },
}));

jest.mock('@/validation', () => ({
  validateInput: jest.fn(),
  validateMongodbId: jest.fn(),
  CreateEventCategorySchema: {},
  UpdateEventCategorySchema: {},
  ERROR_MESSAGES: {
    NOT_FOUND: (type: string, field: string, value: string) => `${type} with ${field} ${value} does not exist`,
  },
}));

describe('EventCategoryResolver mutations', () => {
  let resolver: EventCategoryResolver;

  const mockCategory: EventCategory = {
    eventCategoryId: 'cat-001',
    name: 'Music',
    slug: 'music',
    iconName: 'music-note',
    description: 'Music events',
  };

  const mockContext = {
    user: { userId: 'user-001', userRole: UserRole.Admin },
  } as unknown as ServerContext;

  beforeEach(() => {
    resolver = new EventCategoryResolver();
    jest.clearAllMocks();
    (validation.validateInput as jest.Mock).mockImplementation(() => undefined);
    (validation.validateMongodbId as jest.Mock).mockImplementation(() => undefined);
  });

  describe('createEventCategory', () => {
    it('validates input and calls EventCategoryService.create with actor context', async () => {
      const input: CreateEventCategoryInput = {
        name: 'Music',
        iconName: 'music-note',
        description: 'Music events',
      };
      (EventCategoryService.create as jest.Mock).mockResolvedValue(mockCategory);

      const result = await resolver.createEventCategory(input, mockContext);

      expect(validation.validateInput).toHaveBeenCalled();
      expect(EventCategoryService.create).toHaveBeenCalledWith(input, 'user-001', UserRole.Admin, undefined);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('deleteEventCategoryById', () => {
    it('validates id and calls EventCategoryService.deleteById with actor context', async () => {
      (EventCategoryService.deleteById as jest.Mock).mockResolvedValue(mockCategory);

      const result = await resolver.deleteEventCategoryById('cat-001', mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith('cat-001');
      expect(EventCategoryService.deleteById).toHaveBeenCalledWith('cat-001', 'user-001', UserRole.Admin, undefined);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('deleteEventCategoryBySlug', () => {
    it('calls EventCategoryService.deleteBySlug with actor context', async () => {
      (EventCategoryService.deleteBySlug as jest.Mock).mockResolvedValue(mockCategory);

      const result = await resolver.deleteEventCategoryBySlug('music', mockContext);

      expect(EventCategoryService.deleteBySlug).toHaveBeenCalledWith('music', 'user-001', UserRole.Admin, undefined);
      expect(result).toEqual(mockCategory);
    });
  });
});
