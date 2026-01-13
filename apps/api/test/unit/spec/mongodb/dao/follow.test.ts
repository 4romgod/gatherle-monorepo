import {GraphQLError} from 'graphql';
import {FollowDAO} from '@/mongodb/dao';
import {Follow as FollowModel} from '@/mongodb/models';
import type {Follow, CreateFollowInput} from '@ntlango/commons/types';
import {FollowContentVisibility, FollowTargetType, FollowApprovalStatus} from '@ntlango/commons/types';
import {CustomError, ErrorTypes} from '@/utils';
import {MockMongoError} from '@/test/utils';
import {ERROR_MESSAGES} from '@/validation';

jest.mock('@/mongodb/models', () => ({
  Follow: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndDelete: jest.fn(),
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
    notificationPreferences: {
      contentVisibility: FollowContentVisibility.Active,
    },
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

      const input: CreateFollowInput & {followerUserId: string} = {
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
        notificationPreferences: {
          contentVisibility: FollowContentVisibility.Active,
        },
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
          notificationPreferences: {contentVisibility: FollowContentVisibility.Active},
        }),
      );
      expect(result).toEqual(mockFollow);
    });

    it('omits notificationPreferences when not provided', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (FollowModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockFollow,
      });

      await FollowDAO.upsert({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'});

      const [createArg] = (FollowModel.create as jest.Mock).mock.calls[0];
      expect(createArg.notificationPreferences).toBeUndefined();
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(
        FollowDAO.upsert({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'}),
      ).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(
        FollowDAO.upsert({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'}),
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

      expect(FollowModel.find).toHaveBeenCalledWith({followerUserId: 'user-1'});
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

      expect(FollowModel.find).toHaveBeenCalledWith({targetType: FollowTargetType.User, targetId: 'user-2'});
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
        FollowDAO.remove({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'}),
      ).resolves.toBe(true);
    });

    it('throws NOT_FOUND when missing', async () => {
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(
        FollowDAO.remove({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'}),
      ).rejects.toThrow(CustomError('Follow edge not found', ErrorTypes.NOT_FOUND));
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(
        FollowDAO.remove({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'}),
      ).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (FollowModel.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(
        FollowDAO.remove({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'}),
      ).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
    });
  });

  describe('updateNotificationPreferences', () => {
    it('updates notification preferences successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const updatedFollow = {
        ...mockFollow,
        notificationPreferences: {contentVisibility: FollowContentVisibility.Muted},
      };
      (FollowModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          ...mockFollow,
          notificationPreferences: {contentVisibility: FollowContentVisibility.Active},
          save: mockSave,
          toObject: () => updatedFollow,
        }),
      );

      const result = await FollowDAO.updateNotificationPreferences('follow-1', 'user-1', {
        contentVisibility: FollowContentVisibility.Muted,
      });

      expect(FollowModel.findOne).toHaveBeenCalledWith({followId: 'follow-1', followerUserId: 'user-1'});
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(updatedFollow);
    });

    it('throws NOT_FOUND when follow does not exist', async () => {
      (FollowModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(
        FollowDAO.updateNotificationPreferences('follow-1', 'user-1', {contentVisibility: FollowContentVisibility.Muted}),
      ).rejects.toThrow(CustomError('Follow not found or user not authorized', ErrorTypes.NOT_FOUND));
    });
  });

  describe('updateApprovalStatus', () => {
    it('updates approval status successfully', async () => {
      const mockFollowDoc = {
        ...mockFollow,
        targetId: 'user-2',
        approvalStatus: FollowApprovalStatus.Pending,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({...mockFollow, approvalStatus: FollowApprovalStatus.Accepted}),
      };
      (FollowModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFollowDoc),
      });

      const result = await FollowDAO.updateApprovalStatus('follow-1', 'user-2', FollowApprovalStatus.Accepted);

      expect(FollowModel.findOne).toHaveBeenCalledWith({followId: 'follow-1'});
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
});
