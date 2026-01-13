import 'reflect-metadata';
import {FollowResolver} from '@/graphql/resolvers/follow';
import {FollowDAO, UserDAO} from '@/mongodb/dao';
import type {CreateFollowInput, Follow, User} from '@ntlango/commons/types';
import {FollowTargetType, FollowContentVisibility, FollowApprovalStatus, UserRole, FollowPolicy} from '@ntlango/commons/types';
import {Types} from 'mongoose';
import type {ServerContext} from '@/graphql';

jest.mock('@/mongodb/dao', () => ({
  FollowDAO: {
    upsert: jest.fn(),
    readFollowingForUser: jest.fn(),
    readFollowers: jest.fn(),
    remove: jest.fn(),
    updateNotificationPreferences: jest.fn(),
    updateApprovalStatus: jest.fn(),
    readPendingFollows: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
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

  const mockContext: Partial<ServerContext> = {
    user: mockUser,
  };

  beforeEach(() => {
    resolver = new FollowResolver();
    jest.clearAllMocks();
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
      notificationPreferences: {
        contentVisibility: FollowContentVisibility.Active,
      },
      approvalStatus: FollowApprovalStatus.Accepted,
      createdAt: new Date(),
    };

    (UserDAO.readUserById as jest.Mock).mockResolvedValue({...mockUser, followPolicy: FollowPolicy.Public});
    (FollowDAO.upsert as jest.Mock).mockResolvedValue(mockFollow);

    const result = await resolver.follow(mockInput, mockContext as ServerContext);

    expect(UserDAO.readUserById).toHaveBeenCalledWith(mockInput.targetId);
    expect(FollowDAO.upsert).toHaveBeenCalledWith({...mockInput, followerUserId: mockUser.userId, approvalStatus: FollowApprovalStatus.Accepted});
    expect(result).toEqual(mockFollow);
  });

  it('removes a follow edge', async () => {
    (FollowDAO.remove as jest.Mock).mockResolvedValue(true);

    const result = await resolver.unfollow(FollowTargetType.User, 'target-1', mockContext as ServerContext);

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

    const result = await resolver.readFollowing(mockContext as ServerContext);

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

  it('updates notification preferences', async () => {
    const followId = new Types.ObjectId().toString();
    const mockFollow: Follow = {
      followId,
      followerUserId: mockUser.userId,
      targetType: FollowTargetType.User,
      targetId: 'target-1',
      notificationPreferences: {
        contentVisibility: FollowContentVisibility.Muted,
      },
      approvalStatus: FollowApprovalStatus.Accepted,
      createdAt: new Date(),
    };

    (FollowDAO.updateNotificationPreferences as jest.Mock).mockResolvedValue(mockFollow);

    const result = await resolver.updateFollowNotificationPreferences(
      {
        followId,
        notificationPreferences: {contentVisibility: FollowContentVisibility.Muted},
      },
      mockContext as ServerContext,
    );

    expect(FollowDAO.updateNotificationPreferences).toHaveBeenCalledWith(followId, mockUser.userId, {
      contentVisibility: FollowContentVisibility.Muted,
    });
    expect(result).toEqual(mockFollow);
  });

  it('accepts a follow request', async () => {
    const followId = new Types.ObjectId().toString();
    const mockFollow: Follow = {
      followId,
      followerUserId: 'other-user',
      targetType: FollowTargetType.User,
      targetId: mockUser.userId,
      notificationPreferences: {
        contentVisibility: FollowContentVisibility.Active,
      },
      approvalStatus: FollowApprovalStatus.Accepted,
      createdAt: new Date(),
    };

    (FollowDAO.updateApprovalStatus as jest.Mock).mockResolvedValue(mockFollow);

    const result = await resolver.acceptFollowRequest(followId, mockContext as ServerContext);

    expect(FollowDAO.updateApprovalStatus).toHaveBeenCalledWith(followId, mockUser.userId, FollowApprovalStatus.Accepted);
    expect(result).toEqual(mockFollow);
  });

  it('rejects a follow request', async () => {
    const followId = new Types.ObjectId().toString();
    const mockFollow: Follow = {
      followId,
      followerUserId: 'other-user',
      targetType: FollowTargetType.User,
      targetId: mockUser.userId,
      notificationPreferences: {
        contentVisibility: FollowContentVisibility.Active,
      },
      approvalStatus: FollowApprovalStatus.Rejected,
      createdAt: new Date(),
    };

    (FollowDAO.updateApprovalStatus as jest.Mock).mockResolvedValue(mockFollow);

    const result = await resolver.rejectFollowRequest(followId, mockContext as ServerContext);

    expect(FollowDAO.updateApprovalStatus).toHaveBeenCalledWith(followId, mockUser.userId, FollowApprovalStatus.Rejected);
    expect(result).toBe(true);
  });

  it('reads pending follow requests', async () => {
    const mockList: Follow[] = [];
    (FollowDAO.readPendingFollows as jest.Mock).mockResolvedValue(mockList);

    const result = await resolver.readPendingFollowRequests(FollowTargetType.User, mockContext as ServerContext);

    expect(FollowDAO.readPendingFollows).toHaveBeenCalledWith(mockUser.userId, FollowTargetType.User);
    expect(result).toBe(mockList);
  });
});
