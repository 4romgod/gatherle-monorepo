import 'reflect-metadata';
import { FollowResolver } from '@/graphql/resolvers/follow';
import { FollowDAO, UserDAO, EventDAO } from '@/mongodb/dao';
import type { CreateFollowInput, Follow, User, Event } from '@gatherle/commons/types';
import {
  FollowTargetType,
  FollowApprovalStatus,
  UserRole,
  FollowPolicy,
  SocialVisibility,
} from '@gatherle/commons/types';
import { Types } from 'mongoose';
import type { ServerContext } from '@/graphql';

jest.mock('@/mongodb/dao', () => ({
  FollowDAO: {
    upsert: jest.fn(),
    readFollowingForUser: jest.fn(),
    readFollowers: jest.fn(),
    remove: jest.fn(),
    updateApprovalStatus: jest.fn(),
    readPendingFollows: jest.fn(),
    removeFollower: jest.fn(),
    isFollowing: jest.fn(),
    readSavedEventsForUser: jest.fn(),
    isEventSavedByUser: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
  EventDAO: {
    readEventById: jest.fn(),
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
      approvalStatus: FollowApprovalStatus.Accepted,
      createdAt: new Date(),
    };

    (UserDAO.readUserById as jest.Mock).mockResolvedValue({ ...mockUser, followPolicy: FollowPolicy.Public });
    (FollowDAO.upsert as jest.Mock).mockResolvedValue(mockFollow);

    const result = await resolver.follow(mockInput, mockContext as ServerContext);

    expect(UserDAO.readUserById).toHaveBeenCalledWith(mockInput.targetId);
    expect(FollowDAO.upsert).toHaveBeenCalledWith({
      ...mockInput,
      followerUserId: mockUser.userId,
      approvalStatus: FollowApprovalStatus.Accepted,
    });
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
    const targetUserId = 'target-1';
    const mockTargetUser = { userId: targetUserId, followersListVisibility: 'Public' };

    (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockTargetUser);
    (FollowDAO.readFollowers as jest.Mock).mockResolvedValue(mockList);

    const result = await resolver.readFollowers(FollowTargetType.User, targetUserId, mockContext as ServerContext);

    expect(UserDAO.readUserById).toHaveBeenCalledWith(targetUserId);
    expect(FollowDAO.readFollowers).toHaveBeenCalledWith(FollowTargetType.User, targetUserId);
    expect(result).toBe(mockList);
  });

  it('accepts a follow request', async () => {
    const followId = new Types.ObjectId().toString();
    const mockFollow: Follow = {
      followId,
      followerUserId: 'other-user',
      targetType: FollowTargetType.User,
      targetId: mockUser.userId,
      approvalStatus: FollowApprovalStatus.Accepted,
      createdAt: new Date(),
    };

    (FollowDAO.updateApprovalStatus as jest.Mock).mockResolvedValue(mockFollow);

    const result = await resolver.acceptFollowRequest(followId, mockContext as ServerContext);

    expect(FollowDAO.updateApprovalStatus).toHaveBeenCalledWith(
      followId,
      mockUser.userId,
      FollowApprovalStatus.Accepted,
    );
    expect(result).toEqual(mockFollow);
  });

  it('rejects a follow request', async () => {
    const followId = new Types.ObjectId().toString();
    const mockFollow: Follow = {
      followId,
      followerUserId: 'other-user',
      targetType: FollowTargetType.User,
      targetId: mockUser.userId,
      approvalStatus: FollowApprovalStatus.Rejected,
      createdAt: new Date(),
    };

    (FollowDAO.updateApprovalStatus as jest.Mock).mockResolvedValue(mockFollow);

    const result = await resolver.rejectFollowRequest(followId, mockContext as ServerContext);

    expect(FollowDAO.updateApprovalStatus).toHaveBeenCalledWith(
      followId,
      mockUser.userId,
      FollowApprovalStatus.Rejected,
    );
    expect(result).toBe(true);
  });

  it('reads pending follow requests', async () => {
    const mockList: Follow[] = [];
    (FollowDAO.readPendingFollows as jest.Mock).mockResolvedValue(mockList);

    const result = await resolver.readPendingFollowRequests(FollowTargetType.User, mockContext as ServerContext);

    expect(FollowDAO.readPendingFollows).toHaveBeenCalledWith(mockUser.userId, FollowTargetType.User);
    expect(result).toBe(mockList);
  });

  describe('readFollowers visibility', () => {
    const targetUserId = 'target-user-123';

    it('returns empty array when visibility is Private and viewer is not the owner', async () => {
      const mockTargetUser = {
        userId: targetUserId,
        followersListVisibility: SocialVisibility.Private,
      };
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockTargetUser);

      const result = await resolver.readFollowers(FollowTargetType.User, targetUserId, mockContext as ServerContext);

      expect(result).toEqual([]);
      expect(FollowDAO.readFollowers).not.toHaveBeenCalled();
    });

    it('returns followers when visibility is Private and viewer is the owner', async () => {
      const mockList: Follow[] = [{} as Follow];
      const ownerContext: Partial<ServerContext> = { user: { ...mockUser, userId: targetUserId } };
      const mockTargetUser = {
        userId: targetUserId,
        followersListVisibility: SocialVisibility.Private,
      };
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockTargetUser);
      (FollowDAO.readFollowers as jest.Mock).mockResolvedValue(mockList);

      const result = await resolver.readFollowers(FollowTargetType.User, targetUserId, ownerContext as ServerContext);

      expect(FollowDAO.readFollowers).toHaveBeenCalled();
      expect(result).toBe(mockList);
    });

    it('returns followers when visibility is Followers and viewer follows the target', async () => {
      const mockList: Follow[] = [{} as Follow];
      const mockTargetUser = {
        userId: targetUserId,
        followersListVisibility: SocialVisibility.Followers,
      };
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockTargetUser);
      (FollowDAO.isFollowing as jest.Mock).mockResolvedValue(true);
      (FollowDAO.readFollowers as jest.Mock).mockResolvedValue(mockList);

      const result = await resolver.readFollowers(FollowTargetType.User, targetUserId, mockContext as ServerContext);

      expect(FollowDAO.isFollowing).toHaveBeenCalledWith(mockUser.userId, FollowTargetType.User, targetUserId);
      expect(FollowDAO.readFollowers).toHaveBeenCalled();
      expect(result).toBe(mockList);
    });

    it('returns empty array when visibility is Followers and viewer does not follow', async () => {
      const mockTargetUser = {
        userId: targetUserId,
        followersListVisibility: SocialVisibility.Followers,
      };
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockTargetUser);
      (FollowDAO.isFollowing as jest.Mock).mockResolvedValue(false);

      const result = await resolver.readFollowers(FollowTargetType.User, targetUserId, mockContext as ServerContext);

      expect(FollowDAO.isFollowing).toHaveBeenCalledWith(mockUser.userId, FollowTargetType.User, targetUserId);
      expect(result).toEqual([]);
      expect(FollowDAO.readFollowers).not.toHaveBeenCalled();
    });
  });

  describe('removeFollower', () => {
    it('removes a follower when called by target user', async () => {
      const followerUserId = 'follower-123';
      (FollowDAO.removeFollower as jest.Mock).mockResolvedValue(true);

      const result = await resolver.removeFollower(followerUserId, FollowTargetType.User, mockContext as ServerContext);

      expect(FollowDAO.removeFollower).toHaveBeenCalledWith(mockUser.userId, followerUserId, FollowTargetType.User);
      expect(result).toBe(true);
    });
  });

  describe('follow block enforcement', () => {
    it('prevents following a user who has blocked the current user', async () => {
      const blockerUserId = new Types.ObjectId().toString();
      const mockInput: CreateFollowInput = {
        targetType: FollowTargetType.User,
        targetId: blockerUserId,
      };
      const blockerUser = {
        userId: blockerUserId,
        blockedUserIds: [mockUser.userId],
        followPolicy: FollowPolicy.Public,
      };
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(blockerUser);

      await expect(resolver.follow(mockInput, mockContext as ServerContext)).rejects.toThrow(
        'You cannot follow this user',
      );
    });

    it('prevents following a user that the current user has blocked', async () => {
      const targetUserId = new Types.ObjectId().toString();
      const mockInput: CreateFollowInput = {
        targetType: FollowTargetType.User,
        targetId: targetUserId,
      };
      const targetUser = { userId: targetUserId, followPolicy: FollowPolicy.Public, blockedUserIds: [] };
      const currentUser = { ...mockUser, blockedUserIds: [targetUserId] };
      const contextWithBlock: Partial<ServerContext> = { user: currentUser };
      (UserDAO.readUserById as jest.Mock)
        .mockResolvedValueOnce(targetUser) // First call for target user
        .mockResolvedValueOnce(currentUser); // Second call for follower user

      await expect(resolver.follow(mockInput, contextWithBlock as ServerContext)).rejects.toThrow(
        'You cannot follow a blocked user',
      );
    });
  });

  describe('Save Events (follow Event)', () => {
    const mockEvent: Partial<Event> = {
      eventId: new Types.ObjectId().toString(),
      title: 'Test Event',
      slug: 'test-event',
    };

    it('saves an event by following it', async () => {
      const mockInput: CreateFollowInput = {
        targetType: FollowTargetType.Event,
        targetId: mockEvent.eventId!,
      };
      const mockFollow: Follow = {
        followId: 'follow-event-1',
        followerUserId: mockUser.userId,
        targetType: FollowTargetType.Event,
        targetId: mockEvent.eventId!,
        approvalStatus: FollowApprovalStatus.Accepted,
        createdAt: new Date(),
      };

      (EventDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);
      (FollowDAO.upsert as jest.Mock).mockResolvedValue(mockFollow);

      const result = await resolver.follow(mockInput, mockContext as ServerContext);

      expect(EventDAO.readEventById).toHaveBeenCalledWith(mockInput.targetId);
      expect(FollowDAO.upsert).toHaveBeenCalledWith({
        ...mockInput,
        followerUserId: mockUser.userId,
        approvalStatus: FollowApprovalStatus.Accepted,
      });
      expect(result).toEqual(mockFollow);
    });

    it('throws error when saving non-existent event', async () => {
      const nonExistentEventId = new Types.ObjectId().toString();
      const mockInput: CreateFollowInput = {
        targetType: FollowTargetType.Event,
        targetId: nonExistentEventId,
      };

      (EventDAO.readEventById as jest.Mock).mockRejectedValue(
        new Error(`Event with eventId ${nonExistentEventId} not found`),
      );

      await expect(resolver.follow(mockInput, mockContext as ServerContext)).rejects.toThrow(
        `Event with eventId ${nonExistentEventId} not found`,
      );
    });

    it('unsaves an event by unfollowing it', async () => {
      (FollowDAO.remove as jest.Mock).mockResolvedValue(true);

      const result = await resolver.unfollow(FollowTargetType.Event, mockEvent.eventId!, mockContext as ServerContext);

      expect(FollowDAO.remove).toHaveBeenCalledWith({
        followerUserId: mockUser.userId,
        targetType: FollowTargetType.Event,
        targetId: mockEvent.eventId,
      });
      expect(result).toBe(true);
    });

    it('reads saved events for current user', async () => {
      const mockSavedEvents: Follow[] = [
        {
          followId: 'follow-1',
          followerUserId: mockUser.userId,
          targetType: FollowTargetType.Event,
          targetId: mockEvent.eventId!,
          approvalStatus: FollowApprovalStatus.Accepted,
          createdAt: new Date(),
        },
      ];
      (FollowDAO.readSavedEventsForUser as jest.Mock).mockResolvedValue(mockSavedEvents);

      const result = await resolver.readSavedEvents(mockContext as ServerContext);

      expect(FollowDAO.readSavedEventsForUser).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(mockSavedEvents);
    });

    it('checks if event is saved by current user', async () => {
      (FollowDAO.isEventSavedByUser as jest.Mock).mockResolvedValue(true);

      const result = await resolver.isEventSaved(mockEvent.eventId!, mockContext as ServerContext);

      expect(FollowDAO.isEventSavedByUser).toHaveBeenCalledWith(mockEvent.eventId, mockUser.userId);
      expect(result).toBe(true);
    });

    it('returns false when event is not saved', async () => {
      (FollowDAO.isEventSavedByUser as jest.Mock).mockResolvedValue(false);

      const result = await resolver.isEventSaved(mockEvent.eventId!, mockContext as ServerContext);

      expect(FollowDAO.isEventSavedByUser).toHaveBeenCalledWith(mockEvent.eventId, mockUser.userId);
      expect(result).toBe(false);
    });
  });
});
