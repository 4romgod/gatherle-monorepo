import { Types } from 'mongoose';
import type { UserFeedItem as UserFeedItemEntity } from '@gatherle/commons/types';
import { FeedReason } from '@gatherle/commons/types';
import { UserFeed as UserFeedModel } from '@/mongodb/models';
import { logDaoError, KnownCommonError } from '@/utils';

export interface FeedItemInput {
  userId: string;
  eventId: string;
  score: number;
  reasons: FeedReason[];
  computedAt: Date;
  expiresAt: Date;
}

class UserFeedDAO {
  /**
   * Read the scored feed for a user, sorted by relevance score descending.
   */
  static async readFeedForUser(userId: string, limit = 50, skip = 0): Promise<UserFeedItemEntity[]> {
    try {
      const items = await UserFeedModel.find({ userId }).sort({ score: -1 }).skip(skip).limit(limit).exec();
      return items.map((item) => item.toObject());
    } catch (error) {
      logDaoError('Error reading user feed', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Bulk upsert scored feed items for a user.
   * Uses updateOne+upsert per item so previously scored events are refreshed in place.
   */
  static async bulkUpsertFeedItems(items: FeedItemInput[]): Promise<void> {
    if (items.length === 0) return;
    try {
      const ops = items.map((item) => {
        const id = new Types.ObjectId();
        return {
          updateOne: {
            filter: { userId: item.userId, eventId: item.eventId },
            update: {
              $set: item,
              $setOnInsert: { _id: id, feedItemId: id.toString() },
            },
            upsert: true,
          },
        };
      });
      await UserFeedModel.bulkWrite(ops);
    } catch (error) {
      logDaoError('Error bulk upserting feed items', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Remove all feed items for a user.
   * Called before a full recomputation to ensure stale scores are cleared.
   */
  static async clearFeedForUser(userId: string): Promise<void> {
    try {
      await UserFeedModel.deleteMany({ userId }).exec();
    } catch (error) {
      logDaoError('Error clearing user feed', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Remove a specific event from a user's feed.
   * Called after the user RSVPs to an event (no longer needs to be recommended).
   */
  static async removeEventFromFeed(userId: string, eventId: string): Promise<void> {
    try {
      await UserFeedModel.deleteOne({ userId, eventId }).exec();
    } catch (error) {
      logDaoError('Error removing event from user feed', { error });
      throw KnownCommonError(error);
    }
  }
}

export default UserFeedDAO;
