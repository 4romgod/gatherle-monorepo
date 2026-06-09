import { HttpStatusCode } from '@/constants';
import { handleChatRead } from '@/websocket/routes/chatRead';
import { ChatMessageDAO, WebSocketConnectionDAO } from '@/mongodb/dao';
import { ensureDatabaseConnection } from '@/websocket/database';
import { getConnectionMetadata } from '@/websocket/event';
import { touchConnection } from '@/websocket/routes/touch';
import { isGoneConnectionError, postToConnection } from '@/websocket/gateway';
import { assertWebSocketRateLimit } from '@/websocket/abuseControl';
import { readAuthorizedWebSocketConnection } from '@/websocket/access';
import { CustomError, ErrorTypes } from '@/utils/exceptions';

jest.mock('@/websocket/database', () => ({
  ensureDatabaseConnection: jest.fn(),
}));

jest.mock('@/websocket/abuseControl', () => ({
  assertWebSocketRateLimit: jest.fn(),
}));

jest.mock('@/websocket/routes/touch', () => ({
  touchConnection: jest.fn(),
}));

jest.mock('@/websocket/access', () => ({
  readAuthorizedWebSocketConnection: jest.fn(),
}));

jest.mock('@/websocket/event', () => ({
  getConnectionMetadata: jest.fn(),
}));

jest.mock('@/mongodb/dao', () => ({
  ChatConversationUnreadStateDAO: {
    clearConversationUnread: jest.fn(),
  },
  ChatMessageDAO: {
    markConversationRead: jest.fn(),
    countUnreadForConversation: jest.fn(),
    countUnreadTotal: jest.fn(),
    readLatestInConversation: jest.fn(),
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

const toHttpResponse = (result: Awaited<ReturnType<typeof handleChatRead>>): { statusCode: number; body?: string } =>
  result as { statusCode: number; body?: string };

describe('websocket route: chat.read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
    (assertWebSocketRateLimit as jest.Mock).mockResolvedValue(undefined);
    (readAuthorizedWebSocketConnection as jest.Mock).mockResolvedValue({
      connectionId: 'conn-reader',
      userId: 'user-1',
      domainName: 'api.example.com',
      stage: 'beta',
    });
    (getConnectionMetadata as jest.Mock).mockReturnValue({
      connectionId: 'conn-reader',
      domainName: 'api.example.com',
      stage: 'beta',
    });
    (touchConnection as jest.Mock).mockResolvedValue('conn-reader');
    const { ChatConversationUnreadStateDAO } = require('@/mongodb/dao');
    (ChatConversationUnreadStateDAO.clearConversationUnread as jest.Mock).mockResolvedValue(false);
  });

  it('returns 400 when payload is invalid', async () => {
    const response = toHttpResponse(await handleChatRead({ body: JSON.stringify({}) } as any));

    expect(response.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body ?? '{}')).toEqual({
      message: 'Invalid payload. withUserId is required.',
    });
  });

  it('returns 401 when connection metadata is missing', async () => {
    (readAuthorizedWebSocketConnection as jest.Mock).mockRejectedValue(
      CustomError('Connection is not registered. Reconnect and try again.', ErrorTypes.UNAUTHENTICATED),
    );

    const response = toHttpResponse(await handleChatRead({ body: JSON.stringify({ withUserId: 'user-2' }) } as any));

    expect(response.statusCode).toBe(HttpStatusCode.UNAUTHENTICATED);
  });

  it('marks messages as read and broadcasts updates', async () => {
    (ChatMessageDAO.markConversationRead as jest.Mock).mockResolvedValue(2);

    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([
        { connectionId: 'conn-reader', userId: 'user-1', domainName: 'api.example.com', stage: 'beta' },
      ])
      .mockResolvedValueOnce([
        { connectionId: 'conn-other', userId: 'user-2', domainName: 'api.example.com', stage: 'beta' },
      ]);

    (ChatMessageDAO.countUnreadForConversation as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    (ChatMessageDAO.countUnreadTotal as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(4);

    (ChatMessageDAO.readLatestInConversation as jest.Mock).mockResolvedValue({
      chatMessageId: 'msg-1',
      senderUserId: 'user-2',
      recipientUserId: 'user-1',
      message: 'hello',
      isRead: true,
      createdAt: new Date('2026-02-15T12:00:00.000Z'),
    });

    const response = toHttpResponse(await handleChatRead({ body: JSON.stringify({ withUserId: 'user-2' }) } as any));

    expect(ChatMessageDAO.markConversationRead).toHaveBeenCalledWith('user-1', 'user-2');
    expect(postToConnection).toHaveBeenCalledTimes(4);

    const parsed = JSON.parse(response.body ?? '{}');
    expect(response.statusCode).toBe(HttpStatusCode.OK);
    expect(assertWebSocketRateLimit).toHaveBeenCalledWith('chat.read', {
      connectionId: 'conn-reader',
      userId: 'user-1',
    });
    expect(parsed).toMatchObject({
      message: 'Chat conversation marked as read',
      withUserId: 'user-2',
      markedCount: 2,
      deliveredCount: 2,
      conversationDeliveredCount: 2,
      unreadTotal: 0,
      deliveredToReaderCount: 1,
      deliveredToWithUserCount: 1,
    });
  });

  it('removes stale connections when gateway returns gone error', async () => {
    (ChatMessageDAO.markConversationRead as jest.Mock).mockResolvedValue(1);

    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([
        { connectionId: 'conn-reader', userId: 'user-1', domainName: 'api.example.com', stage: 'beta' },
      ])
      .mockResolvedValueOnce([
        { connectionId: 'conn-stale', userId: 'user-2', domainName: 'api.example.com', stage: 'beta' },
      ]);

    (ChatMessageDAO.countUnreadForConversation as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    (ChatMessageDAO.countUnreadTotal as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    (ChatMessageDAO.readLatestInConversation as jest.Mock).mockResolvedValue(null);

    const goneError = { $metadata: { httpStatusCode: 410 } };
    (postToConnection as jest.Mock).mockRejectedValueOnce(goneError).mockResolvedValue(undefined);
    (isGoneConnectionError as jest.Mock).mockImplementation((error: unknown) => error === goneError);

    const response = toHttpResponse(await handleChatRead({ body: JSON.stringify({ withUserId: 'user-2' }) } as any));

    expect(WebSocketConnectionDAO.removeConnection).toHaveBeenCalledWith('conn-reader');
    expect(response.statusCode).toBe(HttpStatusCode.OK);
  });
});
