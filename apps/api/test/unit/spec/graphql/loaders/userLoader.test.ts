import { createUserLoader } from '@/graphql/loaders';
import { User as UserModel } from '@/mongodb/models';
import type { User } from '@gatherle/commons/types';
import { UserRole } from '@gatherle/commons/types';

jest.mock('@/mongodb/models', () => ({
  User: {
    find: jest.fn(),
  },
}));

describe('UserLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should batch load users by ID', async () => {
    const mockUsers: Array<Partial<User> & { _id: string }> = [
      {
        _id: 'user1',
        userId: 'user1',
        username: 'testuser1',
        email: 'test1@example.com',
        userRole: UserRole.User,
      },
      {
        _id: 'user2',
        userId: 'user2',
        username: 'testuser2',
        email: 'test2@example.com',
        userRole: UserRole.User,
      },
    ];

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockUsers),
    };

    (UserModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createUserLoader();

    // Load multiple users
    const results = await Promise.all([loader.load('user1'), loader.load('user2'), loader.load('user3')]);

    // Should make single batch query
    expect(UserModel.find).toHaveBeenCalledTimes(1);
    expect(UserModel.find).toHaveBeenCalledWith({ _id: { $in: ['user1', 'user2', 'user3'] } });

    // Should return results in correct order
    expect(results[0]).toEqual(mockUsers[0]);
    expect(results[1]).toEqual(mockUsers[1]);
    expect(results[2]).toBeNull(); // user3 not found
  });

  it('should handle empty input', async () => {
    const loader = createUserLoader();
    const results = await loader.loadMany([]);
    expect(results).toEqual([]);
  });

  it('should cache results within the same loader instance', async () => {
    const mockUser: Partial<User> & { _id: string } = {
      _id: 'user1',
      userId: 'user1',
      username: 'testuser1',
      email: 'test1@example.com',
      userRole: UserRole.User,
    };

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockUser]),
    };

    (UserModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createUserLoader();

    // Load same user twice
    await loader.load('user1');
    await loader.load('user1');

    // Should only query database once (cached)
    expect(UserModel.find).toHaveBeenCalledTimes(1);
  });

  it('should maintain correct order when database returns results in different order', async () => {
    const mockUsers: Array<Partial<User> & { _id: string }> = [
      { _id: 'user2', userId: 'user2', username: 'user2', email: 'user2@test.com', userRole: UserRole.User },
      { _id: 'user1', userId: 'user1', username: 'user1', email: 'user1@test.com', userRole: UserRole.User },
      { _id: 'user3', userId: 'user3', username: 'user3', email: 'user3@test.com', userRole: UserRole.User },
    ];

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockUsers),
    };

    (UserModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createUserLoader();

    // Request in specific order
    const results = await Promise.all([loader.load('user1'), loader.load('user2'), loader.load('user3')]);

    // Results should match requested order, not database return order
    expect((results[0] as Partial<User> & { _id: string })?._id).toBe('user1');
    expect((results[1] as Partial<User> & { _id: string })?._id).toBe('user2');
    expect((results[2] as Partial<User> & { _id: string })?._id).toBe('user3');
  });

  it('should handle database errors gracefully', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('Database error')),
    };

    (UserModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createUserLoader();

    await expect(loader.load('user1')).rejects.toThrow('Database error');
  });
});
