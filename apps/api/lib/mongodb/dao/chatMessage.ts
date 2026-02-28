import type {
  ChatConversation,
  ChatMessage as ChatMessageEntity,
  ChatMessageConnection,
} from '@gatherle/commons/types';
import { ChatMessage as ChatMessageModel } from '@/mongodb/models';
import { KnownCommonError , logDaoError } from '@/utils';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface CreateChatMessageInput {
  senderUserId: string;
  recipientUserId: string;
  message: string;
}

export interface ReadChatMessagesOptions {
  limit?: number;
  cursor?: string;
}

const toChatMessageEntity = (message: ChatMessageEntity): ChatMessageEntity => ({
  ...message,
  isRead: message.isRead ?? false,
});

class ChatMessageDAO {
  static buildConversationKey(userIdA: string, userIdB: string): string {
    return [userIdA.trim(), userIdB.trim()].sort((a, b) => a.localeCompare(b)).join(':');
  }

  static async create(input: CreateChatMessageInput): Promise<ChatMessageEntity> {
    try {
      const chatMessage = await ChatMessageModel.create({
        senderUserId: input.senderUserId,
        recipientUserId: input.recipientUserId,
        conversationKey: this.buildConversationKey(input.senderUserId, input.recipientUserId),
        message: input.message,
        isRead: input.senderUserId === input.recipientUserId,
      });

      return toChatMessageEntity(chatMessage.toObject());
    } catch (error) {
      logDaoError('Error creating chat message', {
        error,
        senderUserId: input.senderUserId,
        recipientUserId: input.recipientUserId,
      });
      throw KnownCommonError(error);
    }
  }

  static async readConversation(
    currentUserId: string,
    withUserId: string,
    options: ReadChatMessagesOptions = {},
  ): Promise<ChatMessageConnection> {
    const boundedLimit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const fetchLimit = boundedLimit + 1;

    try {
      const query: Record<string, unknown> = {
        conversationKey: this.buildConversationKey(currentUserId, withUserId),
      };

      if (options.cursor) {
        query.createdAt = { $lt: new Date(options.cursor) };
      }

      const messages = await ChatMessageModel.find(query).sort({ createdAt: -1 }).limit(fetchLimit).exec();

      const hasMore = messages.length > boundedLimit;
      const results = hasMore ? messages.slice(0, boundedLimit) : messages;

      return {
        messages: results.map((message) => toChatMessageEntity(message.toObject())),
        nextCursor: hasMore && results.length > 0 ? results[results.length - 1].createdAt.toISOString() : undefined,
        hasMore,
        count: results.length,
      };
    } catch (error) {
      logDaoError('Error reading chat conversation', {
        error,
        currentUserId,
        withUserId,
        limit: boundedLimit,
      });
      throw KnownCommonError(error);
    }
  }

  static async countUnreadForConversation(currentUserId: string, withUserId: string): Promise<number> {
    try {
      return await ChatMessageModel.countDocuments({
        senderUserId: withUserId,
        recipientUserId: currentUserId,
        isRead: { $ne: true },
      }).exec();
    } catch (error) {
      logDaoError('Error counting unread chat messages for conversation', {
        error,
        currentUserId,
        withUserId,
      });
      throw KnownCommonError(error);
    }
  }

  static async countUnreadTotal(currentUserId: string): Promise<number> {
    try {
      return await ChatMessageModel.countDocuments({
        recipientUserId: currentUserId,
        isRead: { $ne: true },
      }).exec();
    } catch (error) {
      logDaoError('Error counting total unread chat messages', {
        error,
        currentUserId,
      });
      throw KnownCommonError(error);
    }
  }

  static async readLatestInConversation(currentUserId: string, withUserId: string): Promise<ChatMessageEntity | null> {
    try {
      const latest = await ChatMessageModel.findOne({
        conversationKey: this.buildConversationKey(currentUserId, withUserId),
      })
        .sort({ createdAt: -1 })
        .exec();

      return latest ? toChatMessageEntity(latest.toObject()) : null;
    } catch (error) {
      logDaoError('Error reading latest chat message in conversation', {
        error,
        currentUserId,
        withUserId,
      });
      throw KnownCommonError(error);
    }
  }

  static async readConversations(currentUserId: string, limit: number = DEFAULT_LIMIT): Promise<ChatConversation[]> {
    const boundedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

    try {
      type AggregationConversationRow = {
        _id: string;
        unreadCount: number;
        updatedAt: Date;
        lastMessage: ChatMessageEntity;
      };

      const rows = await ChatMessageModel.aggregate<AggregationConversationRow>([
        {
          $match: {
            $or: [{ senderUserId: currentUserId }, { recipientUserId: currentUserId }],
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $addFields: {
            conversationWithUserId: {
              $cond: [{ $eq: ['$senderUserId', currentUserId] }, '$recipientUserId', '$senderUserId'],
            },
          },
        },
        {
          $group: {
            _id: '$conversationWithUserId',
            lastMessage: { $first: '$$ROOT' },
            updatedAt: { $first: '$createdAt' },
            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $eq: ['$recipientUserId', currentUserId] }, { $ne: ['$isRead', true] }],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { updatedAt: -1 } },
        { $limit: boundedLimit },
      ]).exec();

      return rows.map((row) => ({
        conversationWithUserId: row._id,
        lastMessage: toChatMessageEntity(row.lastMessage),
        unreadCount: row.unreadCount ?? 0,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      logDaoError('Error reading chat conversations', {
        error,
        currentUserId,
        limit: boundedLimit,
      });
      throw KnownCommonError(error);
    }
  }

  static async markConversationRead(currentUserId: string, withUserId: string): Promise<number> {
    try {
      const result = await ChatMessageModel.updateMany(
        {
          senderUserId: withUserId,
          recipientUserId: currentUserId,
          isRead: { $ne: true },
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      ).exec();

      return result.modifiedCount;
    } catch (error) {
      logDaoError('Error marking chat conversation as read', {
        error,
        currentUserId,
        withUserId,
      });
      throw KnownCommonError(error);
    }
  }
}

export default ChatMessageDAO;
