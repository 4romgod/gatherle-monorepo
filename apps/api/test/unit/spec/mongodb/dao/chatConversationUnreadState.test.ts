import { GraphQLError } from 'graphql';
import ChatConversationUnreadStateDAO from '@/mongodb/dao/chatConversationUnreadState';
import {
  ChatConversationUnreadState as ChatConversationUnreadStateModel,
  ChatMessage as ChatMessageModel,
} from '@/mongodb/models';

jest.mock('@/mongodb/models', () => ({
  ChatConversationUnreadState: {
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  },
  ChatMessage: {
    collection: {
      name: 'chatmessages',
    },
  },
}));

const createExecQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

describe('ChatConversationUnreadStateDAO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts unread state for a conversation', async () => {
    (ChatConversationUnreadStateModel.updateOne as jest.Mock).mockReturnValue(createExecQuery({ acknowledged: true }));

    await ChatConversationUnreadStateDAO.markConversationUnread('user-1', 'user-2');

    expect(ChatConversationUnreadStateModel.updateOne).toHaveBeenCalledWith(
      { userId: 'user-1', conversationWithUserId: 'user-2' },
      expect.objectContaining({
        $set: expect.objectContaining({
          conversationKey: 'user-1:user-2',
          conversationWithUserId: 'user-2',
          userId: 'user-1',
          markedUnreadAt: expect.any(Date),
        }),
      }),
      { upsert: true },
    );
  });

  it('clears unread state for a single user conversation', async () => {
    (ChatConversationUnreadStateModel.deleteOne as jest.Mock).mockReturnValue(createExecQuery({ deletedCount: 1 }));

    const result = await ChatConversationUnreadStateDAO.clearConversationUnread('user-1', 'user-2');

    expect(result).toBe(true);
    expect(ChatConversationUnreadStateModel.deleteOne).toHaveBeenCalledWith({
      conversationWithUserId: 'user-2',
      userId: 'user-1',
    });
  });

  it('returns marked unread conversation ids as a set', async () => {
    (ChatConversationUnreadStateModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ conversationWithUserId: 'user-2' }, { conversationWithUserId: 'user-3' }]),
    });

    const result = await ChatConversationUnreadStateDAO.readMarkedUnreadConversationIds('user-1', ['user-2', 'user-3']);

    expect(result).toEqual(new Set(['user-2', 'user-3']));
  });

  it('counts only marked unread conversations without actual unread messages', async () => {
    (ChatConversationUnreadStateModel.aggregate as jest.Mock).mockReturnValue(createExecQuery([{ count: 4 }]));

    const result = await ChatConversationUnreadStateDAO.countMarkedUnreadConversationsWithoutUnreadMessages('user-1');

    expect(ChatConversationUnreadStateModel.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ $match: { userId: 'user-1' } }),
        expect.objectContaining({
          $lookup: expect.objectContaining({
            from: ChatMessageModel.collection.name,
          }),
        }),
      ]),
    );
    expect(result).toBe(4);
  });

  it('wraps aggregate failures as GraphQLError', async () => {
    (ChatConversationUnreadStateModel.aggregate as jest.Mock).mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error('aggregate failed')),
    });

    await expect(
      ChatConversationUnreadStateDAO.countMarkedUnreadConversationsWithoutUnreadMessages('user-1'),
    ).rejects.toBeInstanceOf(GraphQLError);
  });
});
