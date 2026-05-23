import {
  isChatConversationUpdatedPayload,
  isChatMessagePayload,
  isChatReadPayload,
  parseChatRealtimeEvent,
} from '@/lib/messages/chatRealtimeProtocol';
import { buildChatThreadItems, formatThreadTime } from '@/lib/messages/thread';

const messagePayload = {
  createdAt: '2026-05-23T10:00:00.000Z',
  isRead: false,
  message: 'Hello',
  messageId: 'message-1',
  recipientUserId: 'user-2',
  replyToMomentCaption: null,
  replyToMomentId: null,
  replyToMomentType: null,
  senderUserId: 'user-1',
};

describe('mobile message realtime protocol', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('validates chat message, read, and conversation update payload shapes', () => {
    expect(isChatMessagePayload(messagePayload)).toBe(true);
    expect(isChatMessagePayload({ ...messagePayload, isRead: 'false' })).toBe(false);
    expect(isChatMessagePayload({ ...messagePayload, replyToMomentId: 123 })).toBe(false);
    expect(isChatMessagePayload(null)).toBe(false);

    expect(
      isChatReadPayload({
        markedCount: 3,
        readAt: '2026-05-23T10:01:00.000Z',
        readerUserId: 'user-2',
        withUserId: 'user-1',
      }),
    ).toBe(true);
    expect(isChatReadPayload({ markedCount: '3', readerUserId: 'user-2', withUserId: 'user-1' })).toBe(false);

    expect(
      isChatConversationUpdatedPayload({
        conversationWithUserId: 'user-1',
        lastMessage: { ...messagePayload, replyToMomentCaption: 123 },
        reason: 'chat.send',
        unreadCount: 1,
        unreadTotal: 4,
        updatedAt: '2026-05-23T10:02:00.000Z',
      }),
    ).toBe(false);
    expect(
      isChatConversationUpdatedPayload({
        conversationWithUserId: 'user-1',
        lastMessage: messagePayload,
        reason: 'chat.send',
        unreadCount: 1,
        unreadTotal: 4,
        updatedAt: '2026-05-23T10:02:00.000Z',
      }),
    ).toBe(true);
    expect(
      isChatConversationUpdatedPayload({
        conversationWithUserId: 'user-1',
        lastMessage: null,
        reason: 'chat.read',
        unreadCount: 0,
        unreadTotal: 0,
        updatedAt: '2026-05-23T10:02:00.000Z',
      }),
    ).toBe(true);
    expect(isChatConversationUpdatedPayload({ reason: 'unknown' })).toBe(false);
  });

  it('parses only known realtime event envelopes', () => {
    expect(parseChatRealtimeEvent(JSON.stringify({ payload: messagePayload, type: 'chat.message' }))).toEqual({
      payload: messagePayload,
      type: 'chat.message',
    });
    expect(parseChatRealtimeEvent(JSON.stringify({ payload: {}, type: 'chat.read' }))).toEqual({
      payload: {},
      type: 'chat.read',
    });
    expect(parseChatRealtimeEvent(JSON.stringify({ payload: {}, type: 'chat.conversation.updated' }))).toEqual({
      payload: {},
      type: 'chat.conversation.updated',
    });
    expect(parseChatRealtimeEvent('{bad json')).toBeNull();
    expect(parseChatRealtimeEvent(JSON.stringify({ payload: {}, type: 'unknown' }))).toBeNull();
  });

  it('formats thread times and inserts day separators when the date changes', () => {
    expect(formatThreadTime('bad')).toBe('');
    expect(formatThreadTime('2026-05-23T10:05:00.000Z')).toMatch(/10:05|12:05/);

    const items = buildChatThreadItems(
      [
        {
          chatMessageId: 'message-1',
          createdAt: '2026-05-22T10:00:00.000Z',
          recipientUserId: 'user-2',
        },
        {
          chatMessageId: 'message-2',
          createdAt: '2026-05-22T11:00:00.000Z',
          recipientUserId: 'user-1',
        },
        {
          chatMessageId: 'message-3',
          createdAt: '2026-05-23T10:00:00.000Z',
          recipientUserId: 'user-2',
        },
        {
          chatMessageId: 'message-4',
          createdAt: 'not-a-date',
          recipientUserId: 'user-2',
        },
      ] as any,
      'user-2',
    );

    expect(items.map((item) => item.kind)).toEqual(['day', 'message', 'message', 'day', 'message', 'day', 'message']);
    expect(items[0]).toMatchObject({ kind: 'day', label: 'Yesterday' });
    expect(items[1]).toMatchObject({ isOutgoing: true, key: 'message-1', kind: 'message' });
    expect(items[2]).toMatchObject({ isOutgoing: false, key: 'message-2', kind: 'message' });
    expect(items[3]).toMatchObject({ kind: 'day', label: 'Today' });
    expect(items[5]).toMatchObject({ kind: 'day', label: '' });
  });
});
