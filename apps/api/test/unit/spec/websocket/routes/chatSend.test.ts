import { HttpStatusCode } from '@/constants';
import { handleChatSend } from '@/websocket/routes/chatSend';
import { ChatMessageDAO, WebSocketConnectionDAO } from '@/mongodb/dao';
import { ensureDatabaseConnection } from '@/websocket/database';
import { touchConnection } from '@/websocket/routes/touch';
import { isGoneConnectionError, postToConnection } from '@/websocket/gateway';

jest.mock('@/websocket/database', () => ({
  ensureDatabaseConnection: jest.fn(),
}));

jest.mock('@/websocket/routes/touch', () => ({
  touchConnection: jest.fn(),
}));

jest.mock('@/mongodb/dao', () => ({
  ChatMessageDAO: {
    create: jest.fn(),
    countUnreadForConversation: jest.fn(),
    countUnreadTotal: jest.fn(),
  },
  WebSocketConnectionDAO: {
    readConnectionByConnectionId: jest.fn(),
    readConnectionsByUserId: jest.fn(),
    removeConnection: jest.fn(),
  },
}));

jest.mock('@/websocket/gateway', () => ({
  createRealtimeEventEnvelope: jest.fn((type: string, payload: unknown) => ({
    type,
    payload,
    sentAt: '2026-02-15T12:00:00.000Z',
  })),
  deduplicateConnections: jest.fn((...connectionGroups: Array<Array<{ connectionId: string }>>) => {
    const deduplicated = new Map<string, { connectionId: string }>();
    connectionGroups.flat().forEach((connection) => {
      deduplicated.set(connection.connectionId, connection);
    });
    return deduplicated;
  }),
  isGoneConnectionError: jest.fn(() => false),
  postToConnection: jest.fn().mockResolvedValue(undefined),
}));

const toHttpResponse = (result: Awaited<ReturnType<typeof handleChatSend>>): { statusCode: number; body?: string } =>
  result as { statusCode: number; body?: string };

describe('websocket route: chat.send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
    (touchConnection as jest.Mock).mockResolvedValue('conn-sender');
  });

  it('returns 400 when payload is invalid', async () => {
    const response = toHttpResponse(await handleChatSend({ body: JSON.stringify({ message: 'hello' }) } as any));

    expect(response.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body ?? '{}')).toEqual({
      message: 'Invalid payload. recipientUserId and message are required.',
    });
  });

  it('returns 401 when sender connection metadata is missing', async () => {
    (WebSocketConnectionDAO.readConnectionByConnectionId as jest.Mock).mockResolvedValue(null);

    const response = toHttpResponse(
      await handleChatSend({ body: JSON.stringify({ recipientUserId: 'user-2', message: 'hello' }) } as any),
    );

    expect(WebSocketConnectionDAO.readConnectionByConnectionId).toHaveBeenCalledWith('conn-sender');
    expect(response.statusCode).toBe(HttpStatusCode.UNAUTHENTICATED);
  });

  it('creates message and broadcasts updates to both users', async () => {
    (WebSocketConnectionDAO.readConnectionByConnectionId as jest.Mock).mockResolvedValue({
      connectionId: 'conn-sender',
      userId: 'user-1',
      domainName: 'api.example.com',
      stage: 'beta',
    });

    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([
        { connectionId: 'conn-recipient', userId: 'user-2', domainName: 'api.example.com', stage: 'beta' },
      ])
      .mockResolvedValueOnce([
        { connectionId: 'conn-sender', userId: 'user-1', domainName: 'api.example.com', stage: 'beta' },
      ]);

    (ChatMessageDAO.create as jest.Mock).mockResolvedValue({
      chatMessageId: 'msg-1',
      senderUserId: 'user-1',
      recipientUserId: 'user-2',
      message: 'hello',
      isRead: false,
      createdAt: new Date('2026-02-15T12:01:00.000Z'),
    });

    (ChatMessageDAO.countUnreadForConversation as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    (ChatMessageDAO.countUnreadTotal as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(3);

    const response = toHttpResponse(
      await handleChatSend({ body: JSON.stringify({ recipientUserId: 'user-2', message: 'hello' }) } as any),
    );

    expect(ChatMessageDAO.create).toHaveBeenCalledWith({
      senderUserId: 'user-1',
      recipientUserId: 'user-2',
      message: 'hello',
    });
    expect(postToConnection).toHaveBeenCalledTimes(4);

    const parsed = JSON.parse(response.body ?? '{}');
    expect(response.statusCode).toBe(HttpStatusCode.OK);
    expect(parsed).toMatchObject({
      message: 'Chat message processed',
      messageId: 'msg-1',
      recipientUserId: 'user-2',
      deliveredCount: 2,
      conversationDeliveredCount: 2,
      unreadTotal: 0,
      recipientOnline: true,
    });
  });

  it('removes stale connections when gateway returns gone error', async () => {
    (WebSocketConnectionDAO.readConnectionByConnectionId as jest.Mock).mockResolvedValue({
      connectionId: 'conn-sender',
      userId: 'user-1',
      domainName: 'api.example.com',
      stage: 'beta',
    });

    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([
        { connectionId: 'conn-recipient', userId: 'user-2', domainName: 'api.example.com', stage: 'beta' },
      ])
      .mockResolvedValueOnce([
        { connectionId: 'conn-sender', userId: 'user-1', domainName: 'api.example.com', stage: 'beta' },
      ]);

    (ChatMessageDAO.create as jest.Mock).mockResolvedValue({
      chatMessageId: 'msg-1',
      senderUserId: 'user-1',
      recipientUserId: 'user-2',
      message: 'hello',
      isRead: false,
      createdAt: new Date('2026-02-15T12:01:00.000Z'),
    });

    (ChatMessageDAO.countUnreadForConversation as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    (ChatMessageDAO.countUnreadTotal as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(3);

    const goneError = { $metadata: { httpStatusCode: 410 } };
    (postToConnection as jest.Mock).mockRejectedValueOnce(goneError).mockResolvedValue(undefined);
    (isGoneConnectionError as jest.Mock).mockImplementation((error: unknown) => error === goneError);

    const response = toHttpResponse(
      await handleChatSend({ body: JSON.stringify({ recipientUserId: 'user-2', message: 'hello' }) } as any),
    );

    expect(WebSocketConnectionDAO.removeConnection).toHaveBeenCalledWith('conn-recipient');
    expect(response.statusCode).toBe(HttpStatusCode.OK);
  });

  it('passes reply context fields to ChatMessageDAO.create when present in payload', async () => {
    (WebSocketConnectionDAO.readConnectionByConnectionId as jest.Mock).mockResolvedValue({
      connectionId: 'conn-sender',
      userId: 'user-1',
      domainName: 'api.example.com',
      stage: 'beta',
    });

    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([
        { connectionId: 'conn-recipient', userId: 'user-2', domainName: 'api.example.com', stage: 'beta' },
      ])
      .mockResolvedValueOnce([
        { connectionId: 'conn-sender', userId: 'user-1', domainName: 'api.example.com', stage: 'beta' },
      ]);

    (ChatMessageDAO.create as jest.Mock).mockResolvedValue({
      chatMessageId: 'msg-reply',
      senderUserId: 'user-1',
      recipientUserId: 'user-2',
      message: 'great moment!',
      replyToMomentId: 'moment-xyz',
      replyToMomentCaption: 'Fun event',
      replyToMomentType: 'image',
      isRead: false,
      createdAt: new Date('2026-04-18T10:00:00.000Z'),
    });

    (ChatMessageDAO.countUnreadForConversation as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    (ChatMessageDAO.countUnreadTotal as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    await handleChatSend({
      body: JSON.stringify({
        recipientUserId: 'user-2',
        message: 'great moment!',
        replyToMomentId: 'moment-xyz',
        replyToMomentCaption: 'Fun event',
        replyToMomentType: 'image',
      }),
    } as any);

    expect(ChatMessageDAO.create).toHaveBeenCalledWith(
      expect.objectContaining({
        replyToMomentId: 'moment-xyz',
        replyToMomentCaption: 'Fun event',
        replyToMomentType: 'image',
      }),
    );
  });

  it('strips reply context fields that are empty strings (treats as absent)', async () => {
    (WebSocketConnectionDAO.readConnectionByConnectionId as jest.Mock).mockResolvedValue({
      connectionId: 'conn-sender',
      userId: 'user-1',
      domainName: 'api.example.com',
      stage: 'beta',
    });

    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([
        { connectionId: 'conn-recipient', userId: 'user-2', domainName: 'api.example.com', stage: 'beta' },
      ])
      .mockResolvedValueOnce([
        { connectionId: 'conn-sender', userId: 'user-1', domainName: 'api.example.com', stage: 'beta' },
      ]);

    (ChatMessageDAO.create as jest.Mock).mockResolvedValue({
      chatMessageId: 'msg-plain',
      senderUserId: 'user-1',
      recipientUserId: 'user-2',
      message: 'plain message',
      isRead: false,
      createdAt: new Date('2026-04-18T10:00:00.000Z'),
    });

    (ChatMessageDAO.countUnreadForConversation as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    (ChatMessageDAO.countUnreadTotal as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await handleChatSend({
      body: JSON.stringify({
        recipientUserId: 'user-2',
        message: 'plain message',
        replyToMomentId: '   ',
        replyToMomentCaption: '',
      }),
    } as any);

    // Empty / whitespace-only values should be normalised to undefined and not be spread into the DAO call
    const createCall = (ChatMessageDAO.create as jest.Mock).mock.calls[0][0];
    expect(createCall.replyToMomentId).toBeUndefined();
    expect(createCall.replyToMomentCaption).toBeUndefined();
  });
});
