import {UserResolver} from '@/graphql/resolvers/user';
import type {User, EventCategory} from '@ntlango/commons/types';
import type {ServerContext} from '@/graphql';
import DataLoader from 'dataloader';

describe('UserResolver Field Resolvers', () => {
  let resolver: UserResolver;
  let mockContext: ServerContext;
  let mockEventCategoryLoader: DataLoader<string, EventCategory | null>;

  beforeEach(() => {
    resolver = new UserResolver();

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

  describe('interests field resolver', () => {
    it('should return empty array when interests is undefined', async () => {
      const user = {userId: 'user1'} as User;
      const result = await resolver.interests(user, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array when interests is empty', async () => {
      const user = {userId: 'user1', interests: []} as unknown as User;
      const result = await resolver.interests(user, mockContext);
      expect(result).toEqual([]);
    });

    it('should return already populated interests without calling DataLoader', async () => {
      const populatedInterests = [
        {eventCategoryId: 'cat1', name: 'Sports', slug: 'sports'} as EventCategory,
        {eventCategoryId: 'cat2', name: 'Music', slug: 'music'} as EventCategory,
      ];

      const user = {
        userId: 'user1',
        interests: populatedInterests as unknown as User['interests'],
      } as unknown as User;

      const loadSpy = jest.spyOn(mockEventCategoryLoader, 'load');

      const result = await resolver.interests(user, mockContext);

      expect(result).toEqual(populatedInterests);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should batch load interests via DataLoader when not populated', async () => {
      const user = {
        userId: 'user1',
        interests: ['cat1', 'cat2'] as unknown as User['interests'],
      } as unknown as User;

      const loadSpy = jest.spyOn(mockEventCategoryLoader, 'load');

      const result = await resolver.interests(user, mockContext);

      expect(loadSpy).toHaveBeenCalledWith('cat1');
      expect(loadSpy).toHaveBeenCalledWith('cat2');
      expect(result).toHaveLength(2);
      expect(result[0]?.eventCategoryId).toBe('cat1');
      expect(result[1]?.eventCategoryId).toBe('cat2');
    });

    it('should filter out null results from DataLoader', async () => {
      const user = {
        userId: 'user1',
        interests: ['cat1', 'nonexistent', 'cat2'] as unknown as User['interests'],
      } as unknown as User;

      const result = await resolver.interests(user, mockContext);

      expect(result).toHaveLength(2);
      expect(result.every((c) => c !== null)).toBe(true);
    });
  });
});
