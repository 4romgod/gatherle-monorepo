import { HttpStatusCode } from '@/constants';
import { handleNotificationSubscribe } from '@/websocket/routes/notificationSubscribe';
import { ensureDatabaseConnection } from '@/websocket/database';
import { touchConnection } from '@/websocket/routes/touch';
import { logger } from '@/utils/logger';

jest.mock('@/websocket/database', () => ({
  ensureDatabaseConnection: jest.fn(),
}));

jest.mock('@/websocket/routes/touch', () => ({
  touchConnection: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  initLogger: jest.fn(),
}));

const toHttpResponse = (
  result: Awaited<ReturnType<typeof handleNotificationSubscribe>>,
): { statusCode: number; body?: string } => result as { statusCode: number; body?: string };

describe('websocket route: notification.subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
    (touchConnection as jest.Mock).mockResolvedValue('conn-bell');
  });

  it('acknowledges supported bell subscriptions', async () => {
    const response = toHttpResponse(
      await handleNotificationSubscribe({ body: JSON.stringify({ topics: ['bell'] }) } as any),
    );

    expect(ensureDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(touchConnection).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(HttpStatusCode.OK);
    expect(JSON.parse(response.body ?? '{}')).toEqual({
      message: 'Subscribed',
      topics: ['bell'],
    });
    expect(logger.info).toHaveBeenCalledWith('Notification subscription acknowledged', {
      connectionId: 'conn-bell',
      topics: ['bell'],
    });
  });

  it('treats omitted topics as an empty subscription list', async () => {
    const response = toHttpResponse(await handleNotificationSubscribe({ body: JSON.stringify({}) } as any));

    expect(response.statusCode).toBe(HttpStatusCode.OK);
    expect(JSON.parse(response.body ?? '{}')).toEqual({
      message: 'Subscribed',
      topics: [],
    });
  });

  it('rejects unsupported topics without accepting the subscription', async () => {
    const response = toHttpResponse(
      await handleNotificationSubscribe({ body: JSON.stringify({ topics: ['bell', 'digest'] }) } as any),
    );

    expect(response.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body ?? '{}')).toEqual({
      message: 'Unsupported notification topic requested.',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Notification subscription rejected because an unsupported topic was requested',
      {
        connectionId: 'conn-bell',
        topics: ['bell', 'digest'],
      },
    );
  });
});
