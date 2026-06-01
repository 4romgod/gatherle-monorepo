import { GraphQLError } from 'graphql';
import { HttpStatusCode } from '@/constants';
import { WEBSOCKET_ROUTES } from '@/websocket/constants';
import { websocketLambdaHandler } from '@/websocket/lambdaHandler';
import { handleDefault, handleNotificationSubscribe, handlePing } from '@/websocket/routes';
import { logger } from '@/utils/logger';

jest.mock('@/websocket/routes', () => ({
  handleChatRead: jest.fn(),
  handleChatSend: jest.fn(),
  handleConnect: jest.fn(),
  handleDefault: jest.fn(),
  handleDisconnect: jest.fn(),
  handleNotificationSubscribe: jest.fn(),
  handlePing: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    setRequestId: jest.fn(),
    clearRequestId: jest.fn(),
  },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  initLogger: jest.fn(),
}));

const createEvent = (routeKey: string) =>
  ({
    requestContext: {
      routeKey,
      eventType: 'MESSAGE',
      connectionId: 'conn-123',
      domainName: 'example.com',
      stage: 'beta',
    },
    body: JSON.stringify({ action: routeKey }),
  }) as any;

const lambdaContext = {
  awsRequestId: 'request-123',
} as any;

describe('websocketLambdaHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a warm-up response when the event has no requestContext', async () => {
    const response = (await websocketLambdaHandler({ source: 'warmup' } as any, lambdaContext, () => undefined)) as {
      statusCode: number;
      body: string;
    };

    expect(response.statusCode).toBe(HttpStatusCode.OK);
    expect(JSON.parse(response.body)).toEqual({ message: 'warm' });
    expect(logger.setRequestId).not.toHaveBeenCalled();
    expect(logger.clearRequestId).not.toHaveBeenCalled();
  });

  it('dispatches notification subscriptions to the matching route handler', async () => {
    const routeResponse = {
      statusCode: HttpStatusCode.OK,
      body: JSON.stringify({ message: 'Subscribed', topics: ['bell'] }),
    };
    (handleNotificationSubscribe as jest.Mock).mockResolvedValue(routeResponse);

    const event = createEvent(WEBSOCKET_ROUTES.NOTIFICATION_SUBSCRIBE);
    const response = (await websocketLambdaHandler(event, lambdaContext, () => undefined)) as {
      statusCode: number;
      body: string;
    };

    expect(logger.setRequestId).toHaveBeenCalledWith('request-123');
    expect(handleNotificationSubscribe).toHaveBeenCalledWith(event);
    expect(response).toEqual(routeResponse);
    expect(logger.clearRequestId).toHaveBeenCalledTimes(1);
  });

  it('returns client-safe status and retry metadata for GraphQLErrors', async () => {
    (handlePing as jest.Mock).mockRejectedValue(
      new GraphQLError('Too many websocket requests', {
        extensions: {
          code: 'BAD_REQUEST',
          http: { status: 429 },
          retryAfterSeconds: 120,
        },
      }),
    );

    const response = (await websocketLambdaHandler(
      createEvent(WEBSOCKET_ROUTES.PING),
      lambdaContext,
      () => undefined,
    )) as {
      statusCode: number;
      body: string;
    };

    expect(response.statusCode).toBe(429);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Too many websocket requests',
      retryAfterSeconds: 120,
    });
    expect(logger.warn).toHaveBeenCalledWith('WebSocket request rejected', {
      routeKey: 'ping',
      eventType: 'MESSAGE',
      connectionId: 'conn-123',
      domainName: 'example.com',
      stage: 'beta',
      error: expect.any(GraphQLError),
      code: 'BAD_REQUEST',
      status: 429,
    });
    expect(logger.clearRequestId).toHaveBeenCalledTimes(1);
  });

  it('returns a generic 500 response for unexpected errors', async () => {
    const unexpectedError = new Error('boom');
    (handleDefault as jest.Mock).mockRejectedValue(unexpectedError);

    const response = (await websocketLambdaHandler(createEvent('unknown.route'), lambdaContext, () => undefined)) as {
      statusCode: number;
      body: string;
    };

    expect(response.statusCode).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Internal server error',
    });
    expect(logger.error).toHaveBeenCalledWith('Error handling WebSocket request', {
      routeKey: 'unknown.route',
      eventType: 'MESSAGE',
      connectionId: 'conn-123',
      domainName: 'example.com',
      stage: 'beta',
      error: unexpectedError,
    });
    expect(logger.clearRequestId).toHaveBeenCalledTimes(1);
  });
});
