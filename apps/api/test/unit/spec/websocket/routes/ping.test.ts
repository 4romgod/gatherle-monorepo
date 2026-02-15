import { HttpStatusCode } from '@/constants';
import { WEBSOCKET_EVENT_TYPES } from '@/websocket/constants';
import { ensureDatabaseConnection } from '@/websocket/database';
import { getConnectionMetadata } from '@/websocket/event';
import { createRealtimeEventEnvelope, postToConnection } from '@/websocket/gateway';
import { handlePing } from '@/websocket/routes/ping';
import { touchConnection } from '@/websocket/routes/touch';

jest.mock('@/websocket/database', () => ({
  ensureDatabaseConnection: jest.fn(),
}));

jest.mock('@/websocket/routes/touch', () => ({
  touchConnection: jest.fn(),
}));

jest.mock('@/websocket/event', () => ({
  getConnectionMetadata: jest.fn(),
}));

jest.mock('@/websocket/gateway', () => ({
  createRealtimeEventEnvelope: jest.fn(),
  postToConnection: jest.fn(),
}));

describe('websocket route: ping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
    (touchConnection as jest.Mock).mockResolvedValue('conn-ping');
    (getConnectionMetadata as jest.Mock).mockReturnValue({
      connectionId: 'conn-ping',
      domainName: 'example.execute-api.eu-west-1.amazonaws.com',
      stage: 'beta',
    });
    (createRealtimeEventEnvelope as jest.Mock).mockReturnValue({
      type: WEBSOCKET_EVENT_TYPES.PING_PONG,
      payload: { message: 'pong' },
      sentAt: '2026-01-01T00:00:00.000Z',
    });
    (postToConnection as jest.Mock).mockResolvedValue(undefined);
  });

  it('touches the connection and publishes a pong event', async () => {
    const event = {
      requestContext: {
        connectionId: 'conn-ping',
        domainName: 'example.execute-api.eu-west-1.amazonaws.com',
        stage: 'beta',
      },
    } as any;

    const result = (await handlePing(event)) as { statusCode: number; body?: string };

    expect(ensureDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(touchConnection).toHaveBeenCalledWith(event);
    expect(getConnectionMetadata).toHaveBeenCalledWith(event);
    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.PING_PONG, {
      message: 'pong',
    });
    expect(postToConnection).toHaveBeenCalledWith(
      {
        connectionId: 'conn-ping',
        domainName: 'example.execute-api.eu-west-1.amazonaws.com',
        stage: 'beta',
      },
      {
        type: WEBSOCKET_EVENT_TYPES.PING_PONG,
        payload: { message: 'pong' },
        sentAt: '2026-01-01T00:00:00.000Z',
      },
    );
    expect(result.statusCode).toBe(HttpStatusCode.OK);
    expect(JSON.parse(result.body ?? '{}')).toEqual({ message: 'pong' });
  });
});
