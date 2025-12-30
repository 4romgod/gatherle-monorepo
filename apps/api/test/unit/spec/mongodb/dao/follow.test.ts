import {GraphQLError} from 'graphql';
import {FollowDAO} from '@/mongodb/dao';
import {Follow as FollowModel} from '@/mongodb/models';
import type {Follow, CreateFollowInput} from '@ntlango/commons/types';
import {FollowStatus, FollowTargetType} from '@ntlango/commons/types';
import {CustomError, ErrorTypes} from '@/utils';
import {MockMongoError} from '@/test/utils';
import {ERROR_MESSAGES} from '@/validation';

jest.mock('@/mongodb/models', () => ({
  Follow: {
    findOneAndUpdate: jest.fn(),
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
    status: FollowStatus.Active,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('upserts a follow edge and returns it', async () => {
      (FollowModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockFollow,
        }),
      );

      const input: CreateFollowInput & {followerUserId: string} = {
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
        status: FollowStatus.Active,
      };

      const result = await FollowDAO.upsert(input);

      expect(FollowModel.findOneAndUpdate).toHaveBeenCalledWith(
        {followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'},
        expect.objectContaining({
          $set: expect.objectContaining({targetType: FollowTargetType.User, targetId: 'user-2', status: FollowStatus.Active}),
          $setOnInsert: expect.objectContaining({followId: expect.any(String), createdAt: expect.any(Date)}),
        }),
        expect.objectContaining({new: true, upsert: true, setDefaultsOnInsert: true}),
      );
      expect(result).toEqual(mockFollow);
    });

    it('omits status when not provided', async () => {
      (FollowModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockFollow,
        }),
      );

      await FollowDAO.upsert({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'});

      const [, update] = (FollowModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(update.$set.status).toBeUndefined();
    });

    it('throws when upsert returns null', async () => {
      (FollowModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(
        FollowDAO.upsert({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'}),
      ).rejects.toThrow(CustomError('Unable to upsert follow', ErrorTypes.INTERNAL_SERVER_ERROR));
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (FollowModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(
        FollowDAO.upsert({followerUserId: 'user-1', targetType: FollowTargetType.User, targetId: 'user-2'}),
      ).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (FollowModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

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
  });
});
