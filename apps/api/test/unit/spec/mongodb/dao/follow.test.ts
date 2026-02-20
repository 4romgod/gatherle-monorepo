import { GraphQLError } from 'graphql';
import { FollowDAO } from '@/mongodb/dao';
import { Follow as FollowModel } from '@/mongodb/models';
import type { Follow, CreateFollowInput } from '@gatherle/commons/types';
import { FollowTargetType, FollowApprovalStatus } from '@gatherle/commons/types';
import { CustomError, ErrorTypes } from '@/utils';
import { MockMongoError } from '@/test/utils';
import { ERROR_MESSAGES } from '@/validation';

jest.mock('@/mongodb/models', () => ({
  Follow: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  sort: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  sort: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
});

describe('FollowDAO', () => {
  const mockFollow: Follow = {
    followId: 'follow-1',
    followerUserId: 'user-1',
    targetType: FollowTargetType.User,
    targetId: 'user-2',
    approvalStatus: FollowApprovalStatus.Accepted,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('upserts a follow edge and returns it', async () => {
      // Mock findOne to return null (no existing follow)
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      // Mock create to return new follow
      (FollowModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockFollow,
      });

      const input: CreateFollowInput & { followerUserId: string } = {
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
      };

      const result = await FollowDAO.upsert(input);

      expect(FollowModel.findOne).toHaveBeenCalledWith({
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
      });
      expect(FollowModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          followerUserId: 'user-1',
          targetType: FollowTargetType.User,
          targetId: 'user-2',
        }),
      );
      expect(result).toEqual(mockFollow);
    });

    it('updates existing follow when re-following after rejection', async () => {
      const existingRejectedFollow = {
        followId: 'follow-1',
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
        approvalStatus: FollowApprovalStatus.Rejected,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({ ...existingRejectedFollow, approvalStatus: FollowApprovalStatus.Pending }),
      };

      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(existingRejectedFollow));

      await FollowDAO.upsert({
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
        approvalStatus: FollowApprovalStatus.Pending,
      });

      expect(FollowModel.findOne).toHaveBeenCalledWith({
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
      });
      expect(existingRejectedFollow.save).toHaveBeenCalled();
      expect(existingRejectedFollow.approvalStatus).toBe(FollowApprovalStatus.Pending);
      expect(FollowModel.create).not.toHaveBeenCalled();
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(
        FollowDAO.upsert({ followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2' }),
      ).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(
        FollowDAO.upsert({ followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2' }),
      ).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
    });
  });

  describe('readFollowingForUser', () => {
    it('reads following list', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockFollow,
          },
        ]),
      );

      const result = await FollowDAO.readFollowingForUser('user-1');

      expect(FollowModel.find).toHaveBeenCalledWith({ followerUserId: 'user-1' });
      expect(result).toEqual([mockFollow]);
    });

    it('wraps errors', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.readFollowingForUser('user-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readFollowers', () => {
    it('reads followers list', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockFollow,
          },
        ]),
      );

      const result = await FollowDAO.readFollowers(FollowTargetType.User, 'user-2');

      expect(FollowModel.find).toHaveBeenCalledWith({
        targetType: FollowTargetType.User,
        targetId: 'user-2',
        approvalStatus: FollowApprovalStatus.Accepted,
      });
      expect(result).toEqual([mockFollow]);
    });

    it('wraps errors', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.readFollowers(FollowTargetType.User, 'user-2')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('remove', () => {
    it('removes a follow edge', async () => {
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockFollow,
        }),
      );

      await expect(
        FollowDAO.remove({ followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2' }),
      ).resolves.toBe(true);
    });

    it('throws NOT_FOUND when missing', async () => {
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(
        FollowDAO.remove({ followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2' }),
      ).rejects.toThrow(CustomError('Follow edge not found', ErrorTypes.NOT_FOUND));
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(
        FollowDAO.remove({ followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2' }),
      ).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(
        FollowDAO.remove({ followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2' }),
      ).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
    });
  });

  describe('updateApprovalStatus', () => {
    it('updates approval status successfully', async () => {
      const mockFollowDoc = {
        ...mockFollow,
        targetId: 'user-2',
        approvalStatus: FollowApprovalStatus.Pending,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({ ...mockFollow, approvalStatus: FollowApprovalStatus.Accepted }),
      };
      (FollowModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFollowDoc),
      });

      const result = await FollowDAO.updateApprovalStatus('follow-1', 'user-2', FollowApprovalStatus.Accepted);

      expect(FollowModel.findOne).toHaveBeenCalledWith({ followId: 'follow-1' });
      expect(mockFollowDoc.save).toHaveBeenCalled();
      expect(result.approvalStatus).toBe(FollowApprovalStatus.Accepted);
    });

    it('throws NOT_FOUND when follow does not exist', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(FollowDAO.updateApprovalStatus('follow-1', 'user-2', FollowApprovalStatus.Accepted)).rejects.toThrow(
        CustomError('Follow request not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('throws UNAUTHORIZED when user is not the target', async () => {
      const mockFollowDoc = {
        ...mockFollow,
        targetId: 'user-3',
      };
      (FollowModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFollowDoc),
      });

      await expect(FollowDAO.updateApprovalStatus('follow-1', 'user-2', FollowApprovalStatus.Accepted)).rejects.toThrow(
        CustomError('Not authorized to modify this follow request', ErrorTypes.UNAUTHORIZED),
      );
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (FollowModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(graphQLError),
      });

      await expect(FollowDAO.updateApprovalStatus('follow-1', 'user-2', FollowApprovalStatus.Accepted)).rejects.toThrow(
        graphQLError,
      );
    });

    it('wraps unknown errors', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(FollowDAO.updateApprovalStatus('follow-1', 'user-2', FollowApprovalStatus.Accepted)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readFollowRequests', () => {
    it('reads follow requests for a user', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          { toObject: () => mockFollow },
          { toObject: () => ({ ...mockFollow, followId: 'follow-2', followerUserId: 'user-3' }) },
        ]),
      );

      const result = await FollowDAO.readFollowRequests('user-2', FollowTargetType.User);

      expect(FollowModel.find).toHaveBeenCalledWith({
        targetId: 'user-2',
        targetType: FollowTargetType.User,
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no requests', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      const result = await FollowDAO.readFollowRequests('user-2', FollowTargetType.User);

      expect(result).toEqual([]);
    });

    it('wraps errors', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.readFollowRequests('user-2', FollowTargetType.User)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readPendingFollows', () => {
    it('reads pending follow requests', async () => {
      const pendingFollow = {
        ...mockFollow,
        approvalStatus: FollowApprovalStatus.Pending,
      };
      (FollowModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => pendingFollow,
          },
        ]),
      );

      const result = await FollowDAO.readPendingFollows('user-2', FollowTargetType.User);

      expect(FollowModel.find).toHaveBeenCalledWith({
        targetId: 'user-2',
        targetType: FollowTargetType.User,
        approvalStatus: FollowApprovalStatus.Pending,
      });
      expect(result).toEqual([pendingFollow]);
    });

    it('wraps errors', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.readPendingFollows('user-2', FollowTargetType.User)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('countFollowers', () => {
    it('counts accepted followers for a target', async () => {
      (FollowModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(10));

      const result = await FollowDAO.countFollowers(FollowTargetType.User, 'user-2');

      expect(FollowModel.countDocuments).toHaveBeenCalledWith({
        targetType: FollowTargetType.User,
        targetId: 'user-2',
        approvalStatus: FollowApprovalStatus.Accepted,
      });
      expect(result).toBe(10);
    });

    it('returns 0 when no followers', async () => {
      (FollowModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(0));

      const result = await FollowDAO.countFollowers(FollowTargetType.Organization, 'org-1');

      expect(result).toBe(0);
    });

    it('wraps errors', async () => {
      (FollowModel.countDocuments as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.countFollowers(FollowTargetType.User, 'user-2')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('isFollowing', () => {
    it('returns true when user is following', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockFollow,
        }),
      );

      const result = await FollowDAO.isFollowing('user-1', FollowTargetType.User, 'user-2');

      expect(FollowModel.findOne).toHaveBeenCalledWith({
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
        approvalStatus: FollowApprovalStatus.Accepted,
      });
      expect(result).toBe(true);
    });

    it('returns false when user is not following', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const result = await FollowDAO.isFollowing('user-1', FollowTargetType.User, 'user-3');

      expect(result).toBe(false);
    });

    it('wraps errors', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.isFollowing('user-1', FollowTargetType.User, 'user-2')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('removeFollower', () => {
    it('removes an accepted follower', async () => {
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockFollow,
        }),
      );

      const result = await FollowDAO.removeFollower('user-2', 'user-1', FollowTargetType.User);

      expect(FollowModel.findOneAndDelete).toHaveBeenCalledWith({
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
        approvalStatus: FollowApprovalStatus.Accepted,
      });
      expect(result).toBe(true);
    });

    it('throws NOT_FOUND when follower not found', async () => {
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(FollowDAO.removeFollower('user-2', 'user-1', FollowTargetType.User)).rejects.toThrow(
        CustomError('Follower not found or not authorized', ErrorTypes.NOT_FOUND),
      );
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(FollowDAO.removeFollower('user-2', 'user-1', FollowTargetType.User)).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.removeFollower('user-2', 'user-1', FollowTargetType.User)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  // ============================================================================
  // SAVED EVENTS METHODS (Event as targetType)
  // ============================================================================

  describe('readSavedEventsForUser', () => {
    const mockEventFollow: Follow = {
      followId: 'follow-event-1',
      followerUserId: 'user-1',
      targetType: FollowTargetType.Event,
      targetId: 'event-1',
      approvalStatus: FollowApprovalStatus.Accepted,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    it('reads saved events for a user', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          { toObject: () => mockEventFollow },
          { toObject: () => ({ ...mockEventFollow, followId: 'follow-event-2', targetId: 'event-2' }) },
        ]),
      );

      const result = await FollowDAO.readSavedEventsForUser('user-1');

      expect(FollowModel.find).toHaveBeenCalledWith({
        followerUserId: 'user-1',
        targetType: FollowTargetType.Event,
        approvalStatus: FollowApprovalStatus.Accepted,
      });
      expect(result).toHaveLength(2);
      expect(result[0].targetId).toBe('event-1');
    });

    it('returns empty array when user has no saved events', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      const result = await FollowDAO.readSavedEventsForUser('user-1');

      expect(result).toEqual([]);
    });

    it('wraps errors', async () => {
      (FollowModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.readSavedEventsForUser('user-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('countSavesForEvent', () => {
    it('counts saves for an event', async () => {
      (FollowModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(25));

      const result = await FollowDAO.countSavesForEvent('event-1');

      expect(FollowModel.countDocuments).toHaveBeenCalledWith({
        targetType: FollowTargetType.Event,
        targetId: 'event-1',
        approvalStatus: FollowApprovalStatus.Accepted,
      });
      expect(result).toBe(25);
    });

    it('returns 0 when event has no saves', async () => {
      (FollowModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(0));

      const result = await FollowDAO.countSavesForEvent('event-new');

      expect(result).toBe(0);
    });

    it('wraps errors', async () => {
      (FollowModel.countDocuments as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.countSavesForEvent('event-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('isEventSavedByUser', () => {
    it('returns true when event is saved by user', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => ({
            followId: 'follow-1',
            followerUserId: 'user-1',
            targetType: FollowTargetType.Event,
            targetId: 'event-1',
            approvalStatus: FollowApprovalStatus.Accepted,
          }),
        }),
      );

      const result = await FollowDAO.isEventSavedByUser('event-1', 'user-1');

      expect(FollowModel.findOne).toHaveBeenCalledWith({
        followerUserId: 'user-1',
        targetType: FollowTargetType.Event,
        targetId: 'event-1',
        approvalStatus: FollowApprovalStatus.Accepted,
      });
      expect(result).toBe(true);
    });

    it('returns false when event is not saved by user', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const result = await FollowDAO.isEventSavedByUser('event-1', 'user-2');

      expect(result).toBe(false);
    });

    it('wraps errors', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(FollowDAO.isEventSavedByUser('event-1', 'user-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
