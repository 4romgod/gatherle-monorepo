import {
  ChatMessage as ChatMessageModel,
  ChatConversationUnreadState as ChatConversationUnreadStateModel,
} from '@/mongodb/models';
import { KnownCommonError, logDaoError } from '@/utils';
import { buildChatConversationKey } from './chatConversationUtils';

class ChatConversationUnreadStateDAO {
  static async markConversationUnread(userId: string, withUserId: string): Promise<void> {
    try {
      await ChatConversationUnreadStateModel.updateOne(
        { userId, conversationWithUserId: withUserId },
        {
          $set: {
            conversationKey: buildChatConversationKey(userId, withUserId),
            conversationWithUserId: withUserId,
            markedUnreadAt: new Date(),
            userId,
          },
        },
        { upsert: true },
      ).exec();
    } catch (error) {
      logDaoError('Error marking chat conversation as unread', {
        error,
        userId,
        withUserId,
      });
      throw KnownCommonError(error);
    }
  }

  static async clearConversationUnread(userId: string, withUserId: string): Promise<boolean> {
    try {
      const result = await ChatConversationUnreadStateModel.deleteOne({
        conversationWithUserId: withUserId,
        userId,
      }).exec();

      return result.deletedCount > 0;
    } catch (error) {
      logDaoError('Error clearing chat conversation unread state', {
        error,
        userId,
        withUserId,
      });
      throw KnownCommonError(error);
    }
  }

  static async clearConversationUnreadForParticipants(userIdA: string, userIdB: string): Promise<number> {
    try {
      const result = await ChatConversationUnreadStateModel.deleteMany({
        conversationKey: buildChatConversationKey(userIdA, userIdB),
        userId: { $in: [userIdA, userIdB] },
      }).exec();

      return result.deletedCount ?? 0;
    } catch (error) {
      logDaoError('Error clearing chat conversation unread state for participants', {
        error,
        userIdA,
        userIdB,
      });
      throw KnownCommonError(error);
    }
  }

  static async readMarkedUnreadConversationIds(userId: string, withUserIds: string[]): Promise<Set<string>> {
    if (withUserIds.length === 0) {
      return new Set<string>();
    }

    try {
      const states = await ChatConversationUnreadStateModel.find({
        conversationWithUserId: { $in: withUserIds },
        userId,
      })
        .select({ conversationWithUserId: 1, _id: 0 })
        .lean()
        .exec();

      return new Set(
        states
          .map((state) => state.conversationWithUserId)
          .filter(
            (conversationWithUserId): conversationWithUserId is string => typeof conversationWithUserId === 'string',
          ),
      );
    } catch (error) {
      logDaoError('Error reading marked unread chat conversation ids', {
        error,
        userId,
        withUserIds,
      });
      throw KnownCommonError(error);
    }
  }

  static async countMarkedUnreadConversationsWithoutUnreadMessages(userId: string): Promise<number> {
    try {
      const rows = await ChatConversationUnreadStateModel.aggregate<{ count: number }>([
        { $match: { userId } },
        {
          $lookup: {
            from: ChatMessageModel.collection.name,
            let: {
              conversationKey: '$conversationKey',
              currentUserId: '$userId',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$conversationKey', '$$conversationKey'] },
                      { $eq: ['$recipientUserId', '$$currentUserId'] },
                      { $ne: ['$isRead', true] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'unreadMessages',
          },
        },
        { $match: { 'unreadMessages.0': { $exists: false } } },
        { $count: 'count' },
      ]).exec();

      return rows[0]?.count ?? 0;
    } catch (error) {
      logDaoError('Error counting marked unread chat conversations without unread messages', {
        error,
        userId,
      });
      throw KnownCommonError(error);
    }
  }
}

export default ChatConversationUnreadStateDAO;
