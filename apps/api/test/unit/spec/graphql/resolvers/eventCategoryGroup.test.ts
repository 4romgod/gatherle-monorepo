import 'reflect-metadata';
import { EventCategoryGroupResolver } from '@/graphql/resolvers/eventCategoryGroup';
import type { CreateEventCategoryGroupInput, EventCategoryGroup } from '@gatherle/commons/server/types';
import { UserRole } from '@gatherle/commons/server/types';
import type { ServerContext } from '@/graphql';
import EventCategoryGroupService from '@/services/eventCategoryGroup';

jest.mock('@/services/eventCategoryGroup', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    deleteBySlug: jest.fn(),
  },
}));

jest.mock('@/mongodb/dao', () => ({
  EventCategoryGroupDAO: {
    updateEventCategoryGroup: jest.fn(),
    readEventCategoryGroupBySlug: jest.fn(),
    readEventCategoryGroups: jest.fn(),
  },
}));

describe('EventCategoryGroupResolver mutations', () => {
  let resolver: EventCategoryGroupResolver;

  const mockGroup: EventCategoryGroup = {
    eventCategoryGroupId: 'group-001',
    name: 'Arts',
    slug: 'arts',
    eventCategories: [],
  };

  const mockContext = {
    user: { userId: 'user-001', userRole: UserRole.Admin },
  } as unknown as ServerContext;

  beforeEach(() => {
    resolver = new EventCategoryGroupResolver();
    jest.clearAllMocks();
  });

  describe('createEventCategoryGroup', () => {
    it('calls EventCategoryGroupService.create with actor context', async () => {
      const input: CreateEventCategoryGroupInput = { name: 'Arts', eventCategories: [] };
      (EventCategoryGroupService.create as jest.Mock).mockResolvedValue(mockGroup);

      const result = await resolver.createEventCategoryGroup(input, mockContext);

      expect(EventCategoryGroupService.create).toHaveBeenCalledWith(input, 'user-001', UserRole.Admin, undefined);
      expect(result).toEqual(mockGroup);
    });
  });

  describe('deleteEventCategoryGroupBySlug', () => {
    it('calls EventCategoryGroupService.deleteBySlug with actor context', async () => {
      (EventCategoryGroupService.deleteBySlug as jest.Mock).mockResolvedValue(mockGroup);

      const result = await resolver.deleteEventCategoryGroupBySlug('arts', mockContext);

      expect(EventCategoryGroupService.deleteBySlug).toHaveBeenCalledWith(
        'arts',
        'user-001',
        UserRole.Admin,
        undefined,
      );
      expect(result).toEqual(mockGroup);
    });
  });
});
