import 'reflect-metadata';
import {FollowResolver} from '@/graphql/resolvers/follow';
import {FollowDAO} from '@/mongodb/dao';
import type {CreateFollowInput, Follow, User} from '@ntlango/commons/types';
import {FollowTargetType, FollowStatus, UserRole} from '@ntlango/commons/types';
import {Types} from 'mongoose';
import {requireAuthenticatedUser} from '@/utils';

jest.mock('@/mongodb/dao', () => ({
  FollowDAO: {
    upsert: jest.fn(),
    readFollowingForUser: jest.fn(),
    readFollowers: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/utils', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

describe('FollowResolver', () => {
  let resolver: FollowResolver;
  const mockUser: User = {
    userId: 'user-1',
    email: 'friend@example.com',
    username: 'friend',
    birthdate: '1990-01-01',
    given_name: 'Friend',
    family_name: 'Friendson',
    password: 'secret',
    userRole: UserRole.User,
  };

  beforeEach(() => {
    resolver = new FollowResolver();
    jest.clearAllMocks();
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
  });

  it('creates a follow edge', async () => {
    const mockInput: CreateFollowInput = {
      targetType: FollowTargetType.User,
      targetId: new Types.ObjectId().toString(),
    };
    const mockFollow: Follow = {
      followId: 'follow-1',
      followerUserId: mockUser.userId,
      targetType: FollowTargetType.User,
      targetId: mockInput.targetId,
      status: FollowStatus.Active,
      createdAt: new Date(),
    };

    (FollowDAO.upsert as jest.Mock).mockResolvedValue(mockFollow);

    const result = await resolver.follow(mockInput, {} as never);

    expect(requireAuthenticatedUser).toHaveBeenCalled();
    expect(FollowDAO.upsert).toHaveBeenCalledWith({...mockInput, followerUserId: mockUser.userId});
    expect(result).toEqual(mockFollow);
  });

  it('removes a follow edge', async () => {
    (FollowDAO.remove as jest.Mock).mockResolvedValue(true);

    const result = await resolver.unfollow(FollowTargetType.User, 'target-1', {} as never);

    expect(requireAuthenticatedUser).toHaveBeenCalled();
    expect(FollowDAO.remove).toHaveBeenCalledWith({
      followerUserId: mockUser.userId,
      targetType: FollowTargetType.User,
      targetId: 'target-1',
    });
    expect(result).toBe(true);
  });

  it('reads following list', async () => {
    const mockList: Follow[] = [];
    (FollowDAO.readFollowingForUser as jest.Mock).mockResolvedValue(mockList);

    const result = await resolver.readFollowing({} as never);

    expect(requireAuthenticatedUser).toHaveBeenCalled();
    expect(FollowDAO.readFollowingForUser).toHaveBeenCalledWith(mockUser.userId);
    expect(result).toBe(mockList);
  });

  it('reads followers', async () => {
    const mockList: Follow[] = [];
    (FollowDAO.readFollowers as jest.Mock).mockResolvedValue(mockList);

    const result = await resolver.readFollowers(FollowTargetType.User, 'target-1');

    expect(FollowDAO.readFollowers).toHaveBeenCalledWith(FollowTargetType.User, 'target-1');
    expect(result).toBe(mockList);
  });
});
