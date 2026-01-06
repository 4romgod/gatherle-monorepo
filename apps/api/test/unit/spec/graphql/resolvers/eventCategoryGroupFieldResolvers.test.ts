import {EventCategoryGroupResolver} from '@/graphql/resolvers/eventCategoryGroup';
import type {EventCategoryGroup, EventCategory, User} from '@ntlango/commons/types';
import type {ServerContext} from '@/graphql';
import DataLoader from 'dataloader';

describe('EventCategoryGroupResolver Field Resolvers', () => {
  let resolver: EventCategoryGroupResolver;
  let mockContext: ServerContext;
  let mockEventCategoryLoader: DataLoader<string, EventCategory | null>;

  beforeEach(() => {
    resolver = new EventCategoryGroupResolver();

    mockEventCategoryLoader = new DataLoader(async (ids) => {
      return ids.map((id) => {
        if (id === 'cat1') return {eventCategoryId: 'cat1', name: 'Sports'} as EventCategory;
        if (id === 'cat2') return {eventCategoryId: 'cat2', name: 'Music'} as EventCategory;
        return null;
      });
    });

    mockContext = {
      loaders: {
        eventCategory: mockEventCategoryLoader,
        user: {} as DataLoader<string, User | null>,
      },
    } as ServerContext;
  });

  describe('eventCategories field resolver', () => {
    it('should return empty array when eventCategories is undefined', async () => {
      const group = {eventCategoryGroupId: 'group1', name: 'Group 1', slug: 'group-1'} as EventCategoryGroup;
      const result = await resolver.eventCategories(group, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array when eventCategories is empty', async () => {
      const group = {eventCategoryGroupId: 'group1', name: 'Group 1', slug: 'group-1', eventCategories: []} as EventCategoryGroup;
      const result = await resolver.eventCategories(group, mockContext);
      expect(result).toEqual([]);
    });

    it('should return already populated categories without calling DataLoader', async () => {
      const populatedCategories = [
        {eventCategoryId: 'cat1', name: 'Sports', slug: 'sports'} as EventCategory,
        {eventCategoryId: 'cat2', name: 'Music', slug: 'music'} as EventCategory,
      ];

      const group = {
        eventCategoryGroupId: 'group1',
        name: 'Group 1',
        slug: 'group-1',
        eventCategories: populatedCategories as unknown as EventCategoryGroup['eventCategories'],
      } as Partial<EventCategoryGroup> as EventCategoryGroup;

      const loadSpy = jest.spyOn(mockEventCategoryLoader, 'load');

      const result = await resolver.eventCategories(group, mockContext);

      expect(result).toEqual(populatedCategories);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should batch load categories via DataLoader when not populated', async () => {
      const group = {
        eventCategoryGroupId: 'group1',
        name: 'Group 1',
        slug: 'group-1',
        eventCategories: ['cat1', 'cat2'] as unknown as EventCategoryGroup['eventCategories'],
      } as Partial<EventCategoryGroup> as EventCategoryGroup;

      const loadSpy = jest.spyOn(mockEventCategoryLoader, 'load');

      const result = await resolver.eventCategories(group, mockContext);

      expect(loadSpy).toHaveBeenCalledWith('cat1');
      expect(loadSpy).toHaveBeenCalledWith('cat2');
      expect(result).toHaveLength(2);
      expect(result[0]?.eventCategoryId).toBe('cat1');
      expect(result[1]?.eventCategoryId).toBe('cat2');
    });

    it('should filter out null results from DataLoader', async () => {
      const group = {
        eventCategoryGroupId: 'group1',
        name: 'Group 1',
        slug: 'group-1',
        eventCategories: ['cat1', 'nonexistent', 'cat2'] as unknown as EventCategoryGroup['eventCategories'],
      } as Partial<EventCategoryGroup> as EventCategoryGroup;

      const result = await resolver.eventCategories(group, mockContext);

      expect(result).toHaveLength(2);
      expect(result.every((c) => c !== null)).toBe(true);
    });
  });
});
