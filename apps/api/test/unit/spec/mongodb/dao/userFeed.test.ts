import { UserFeedDAO } from '@/mongodb/dao';
import { UserFeed as UserFeedModel } from '@/mongodb/models';
import type { UserFeedItem } from '@gatherle/commons/types';
import { FeedReason } from '@gatherle/commons/types';
import { MockMongoError } from '@/test/utils';
import { GraphQLError } from 'graphql';

jest.mock('@/mongodb/models', () => ({
  UserFeed: {
    find: jest.fn(),
    bulkWrite: jest.fn(),
    deleteMany: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
});

describe('UserFeedDAO', () => {
  const now = new Date('2024-06-01T00:00:00Z');

  const mockFeedItem: UserFeedItem = {
    feedItemId: 'feed-1',
    userId: 'user-1',
    eventId: 'event-1',
    score: 55,
    reasons: [FeedReason.CategoryMatch, FeedReason.FriendAttending],
    computedAt: now,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('readFeedForUser', () => {
    it('returns feed items sorted by score for a user', async () => {
      (UserFeedModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([{ toObject: () => mockFeedItem }]),
      );

      const result = await UserFeedDAO.readFeedForUser('user-1');

      expect(UserFeedModel.find).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toEqual([mockFeedItem]);
    });

    it('returns empty array when no feed exists', async () => {
      (UserFeedModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      const result = await UserFeedDAO.readFeedForUser('user-1');

      expect(result).toEqual([]);
    });

    it('applies limit and skip', async () => {
      const mockQuery = createMockSuccessMongooseQuery([]);
      (UserFeedModel.find as jest.Mock).mockReturnValue(mockQuery);

      await UserFeedDAO.readFeedForUser('user-1', 10, 20);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.skip).toHaveBeenCalledWith(20);
    });

    it('wraps errors', async () => {
      (UserFeedModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(UserFeedDAO.readFeedForUser('user-1')).rejects.toThrow(GraphQLError);
    });
  });

  describe('bulkUpsertFeedItems', () => {
    it('does nothing when passed an empty array', async () => {
      await UserFeedDAO.bulkUpsertFeedItems([]);

      expect(UserFeedModel.bulkWrite).not.toHaveBeenCalled();
    });

    it('calls bulkWrite with upsert operations', async () => {
      (UserFeedModel.bulkWrite as jest.Mock).mockResolvedValue({});

      await UserFeedDAO.bulkUpsertFeedItems([
        {
          userId: 'user-1',
          eventId: 'event-1',
          score: 55,
          reasons: [FeedReason.CategoryMatch],
          computedAt: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000),
        },
      ]);

      expect(UserFeedModel.bulkWrite).toHaveBeenCalledTimes(1);
      const ops = (UserFeedModel.bulkWrite as jest.Mock).mock.calls[0][0];
      expect(ops).toHaveLength(1);
      expect(ops[0].updateOne.filter).toEqual({ userId: 'user-1', eventId: 'event-1' });
      expect(ops[0].updateOne.upsert).toBe(true);
    });

    it('sets _id and feedItemId to the same value on insert', async () => {
      (UserFeedModel.bulkWrite as jest.Mock).mockResolvedValue({});

      await UserFeedDAO.bulkUpsertFeedItems([
        {
          userId: 'user-1',
          eventId: 'event-1',
          score: 40,
          reasons: [],
          computedAt: now,
          expiresAt: now,
        },
      ]);

      const ops = (UserFeedModel.bulkWrite as jest.Mock).mock.calls[0][0];
      const { _id, feedItemId } = ops[0].updateOne.update.$setOnInsert;
      expect(feedItemId).toBe(_id.toString());
    });

    it('wraps errors', async () => {
      (UserFeedModel.bulkWrite as jest.Mock).mockRejectedValue(new MockMongoError(0));

      await expect(
        UserFeedDAO.bulkUpsertFeedItems([
          {
            userId: 'user-1',
            eventId: 'event-1',
            score: 10,
            reasons: [],
            computedAt: now,
            expiresAt: now,
          },
        ]),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('clearFeedForUser', () => {
    it('deletes all feed items for a user', async () => {
      (UserFeedModel.deleteMany as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 3 }),
      });

      await UserFeedDAO.clearFeedForUser('user-1');

      expect(UserFeedModel.deleteMany).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    it('wraps errors', async () => {
      (UserFeedModel.deleteMany as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(UserFeedDAO.clearFeedForUser('user-1')).rejects.toThrow(GraphQLError);
    });
  });

  describe('removeEventFromFeed', () => {
    it('removes a specific event from a user feed', async () => {
      (UserFeedModel.deleteOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      await UserFeedDAO.removeEventFromFeed('user-1', 'event-1');

      expect(UserFeedModel.deleteOne).toHaveBeenCalledWith({ userId: 'user-1', eventId: 'event-1' });
    });

    it('wraps errors', async () => {
      (UserFeedModel.deleteOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(UserFeedDAO.removeEventFromFeed('user-1', 'event-1')).rejects.toThrow(GraphQLError);
    });
  });
});
