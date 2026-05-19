import { GraphQLError } from 'graphql';
import WebSocketRequestThrottleDAO from '@/mongodb/dao/websocketRequestThrottle';
import { WebSocketRequestThrottle as WebSocketRequestThrottleModel } from '@/mongodb/models';
import { logDaoError } from '@/utils';

jest.mock('@/mongodb/models', () => ({
  WebSocketRequestThrottle: {
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('@/utils', () => {
  const actual = jest.requireActual('@/utils');
  return {
    ...actual,
    logDaoError: jest.fn(),
  };
});

const createExecQuery = <T>(value: T, shouldReject = false) => ({
  exec: jest.fn().mockImplementation(() => (shouldReject ? Promise.reject(value) : Promise.resolve(value))),
});

describe('WebSocketRequestThrottleDAO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds stable per-route scope keys', () => {
    expect(WebSocketRequestThrottleDAO.buildScopeKey('chat.send', 'connection', ' conn-1 ')).toBe(
      'chat.send:connection:conn-1',
    );
    expect(WebSocketRequestThrottleDAO.buildScopeKey('chat.send', 'user', ' user-1 ')).toBe('chat.send:user:user-1');
  });

  it('allows websocket traffic while counters remain within the configured window', async () => {
    (WebSocketRequestThrottleModel.findOneAndUpdate as jest.Mock).mockReturnValue(
      createExecQuery({
        scopeKey: 'chat.send:connection:conn-1',
        routeKey: 'chat.send',
        attemptCount: 3,
        windowStartedAt: new Date('2026-05-18T11:59:30.000Z'),
        expiresAt: new Date('2026-05-18T12:10:00.000Z'),
      }),
    );

    await expect(
      WebSocketRequestThrottleDAO.assertAllowed(
        'chat.send',
        ['chat.send:connection:conn-1'],
        { maxRequests: 20, windowMs: 60_000 },
        new Date('2026-05-18T12:00:00.000Z'),
      ),
    ).resolves.toBeUndefined();
  });

  it('throws a 429 GraphQLError when a route exceeds its configured request budget', async () => {
    (WebSocketRequestThrottleModel.findOneAndUpdate as jest.Mock).mockReturnValue(
      createExecQuery({
        scopeKey: 'chat.send:user:user-1',
        routeKey: 'chat.send',
        attemptCount: 21,
        windowStartedAt: new Date('2026-05-18T11:59:30.000Z'),
        expiresAt: new Date('2026-05-18T12:10:00.000Z'),
      }),
    );

    await expect(
      WebSocketRequestThrottleDAO.assertAllowed(
        'chat.send',
        ['chat.send:user:user-1'],
        { maxRequests: 20, windowMs: 60_000 },
        new Date('2026-05-18T12:00:00.000Z'),
      ),
    ).rejects.toMatchObject({
      extensions: {
        code: 'BAD_REQUEST',
        http: { status: 429 },
        retryAfterSeconds: 30,
        maxRequests: 20,
        windowSeconds: 60,
      },
    });
  });

  it('retries once when the initial upsert loses a duplicate-key race', async () => {
    const duplicateKeyError = { code: 11000, message: 'E11000 duplicate key error' };
    (WebSocketRequestThrottleModel.findOneAndUpdate as jest.Mock)
      .mockReturnValueOnce(createExecQuery(null))
      .mockReturnValueOnce(createExecQuery(duplicateKeyError, true))
      .mockReturnValueOnce(
        createExecQuery({
          scopeKey: 'chat.send:user:user-1',
          routeKey: 'chat.send',
          attemptCount: 4,
          windowStartedAt: new Date('2026-05-18T11:59:30.000Z'),
          expiresAt: new Date('2026-05-18T12:10:00.000Z'),
        }),
      );

    await expect(
      WebSocketRequestThrottleDAO.assertAllowed(
        'chat.send',
        ['chat.send:user:user-1'],
        { maxRequests: 20, windowMs: 60_000 },
        new Date('2026-05-18T12:00:00.000Z'),
      ),
    ).resolves.toBeUndefined();

    expect(WebSocketRequestThrottleModel.findOneAndUpdate).toHaveBeenCalledTimes(3);
    expect(logDaoError).not.toHaveBeenCalled();
  });

  it('wraps unexpected persistence failures', async () => {
    const error = new Error('mongo down');
    (WebSocketRequestThrottleModel.findOneAndUpdate as jest.Mock).mockReturnValue(createExecQuery(error, true));

    await expect(
      WebSocketRequestThrottleDAO.assertAllowed('ping', ['ping:connection:conn-1'], {
        maxRequests: 120,
        windowMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(logDaoError).toHaveBeenCalledWith('Error enforcing websocket request throttle', {
      error,
      routeKey: 'ping',
      scopeKeys: ['ping:connection:conn-1'],
    });
  });
});
