import { HttpStatusCode } from '@/constants';
import { ensureDatabaseConnection } from '@/websocket/database';
import { handleDefault } from '@/websocket/routes/default';
import { handleChatRead } from '@/websocket/routes/chatRead';
import { handleChatSend } from '@/websocket/routes/chatSend';
import { handleNotificationSubscribe } from '@/websocket/routes/notificationSubscribe';
import { handlePing } from '@/websocket/routes/ping';
import { touchConnection } from '@/websocket/routes/touch';

jest.mock('@/websocket/database', () => ({
  ensureDatabaseConnection: jest.fn(),
}));

jest.mock('@/websocket/routes/touch', () => ({
  touchConnection: jest.fn(),
}));

jest.mock('@/websocket/routes/chatSend', () => ({
  handleChatSend: jest.fn(),
}));

jest.mock('@/websocket/routes/chatRead', () => ({
  handleChatRead: jest.fn(),
}));

jest.mock('@/websocket/routes/notificationSubscribe', () => ({
  handleNotificationSubscribe: jest.fn(),
}));

jest.mock('@/websocket/routes/ping', () => ({
  handlePing: jest.fn(),
}));

const toHttpResponse = (result: Awaited<ReturnType<typeof handleDefault>>): { statusCode: number; body?: string } =>
  result as { statusCode: number; body?: string };

describe('websocket route: $default', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
    (touchConnection as jest.Mock).mockResolvedValue('conn-default');
  });

  it('delegates chat.send action to handleChatSend', async () => {
    (handleChatSend as jest.Mock).mockResolvedValue({
      statusCode: HttpStatusCode.OK,
      body: JSON.stringify({ delegated: 'chat.send' }),
    });

    const event = { body: JSON.stringify({ action: 'chat.send', recipientUserId: 'user-2', message: 'hi' }) } as any;
    const response = toHttpResponse(await handleDefault(event));

    expect(handleChatSend).toHaveBeenCalledWith(event);
    expect(ensureDatabaseConnection).not.toHaveBeenCalled();
    expect(touchConnection).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(HttpStatusCode.OK);
    expect(JSON.parse(response.body ?? '{}')).toEqual({ delegated: 'chat.send' });
  });

  it('delegates chat.read action to handleChatRead', async () => {
    (handleChatRead as jest.Mock).mockResolvedValue({
      statusCode: HttpStatusCode.OK,
      body: JSON.stringify({ delegated: 'chat.read' }),
    });

    const event = { body: JSON.stringify({ action: 'chat.read', withUserId: 'user-2' }) } as any;
    const response = toHttpResponse(await handleDefault(event));

    expect(handleChatRead).toHaveBeenCalledWith(event);
    expect(ensureDatabaseConnection).not.toHaveBeenCalled();
    expect(touchConnection).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(HttpStatusCode.OK);
  });

  it('delegates notification.subscribe action to handleNotificationSubscribe', async () => {
    (handleNotificationSubscribe as jest.Mock).mockResolvedValue({
      statusCode: HttpStatusCode.OK,
      body: JSON.stringify({ delegated: 'notification.subscribe' }),
    });

    const event = { body: JSON.stringify({ action: 'notification.subscribe', topics: ['bell'] }) } as any;
    const response = toHttpResponse(await handleDefault(event));

    expect(handleNotificationSubscribe).toHaveBeenCalledWith(event);
    expect(ensureDatabaseConnection).not.toHaveBeenCalled();
    expect(touchConnection).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(HttpStatusCode.OK);
  });

  it('delegates ping action to handlePing', async () => {
    (handlePing as jest.Mock).mockResolvedValue({
      statusCode: HttpStatusCode.OK,
      body: JSON.stringify({ delegated: 'ping' }),
    });

    const event = { body: JSON.stringify({ action: 'ping' }) } as any;
    const response = toHttpResponse(await handleDefault(event));

    expect(handlePing).toHaveBeenCalledWith(event);
    expect(ensureDatabaseConnection).not.toHaveBeenCalled();
    expect(touchConnection).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(HttpStatusCode.OK);
  });

  it('keeps no-op behavior for unknown actions', async () => {
    const response = toHttpResponse(await handleDefault({ body: JSON.stringify({ action: 'unknown.action' }) } as any));

    expect(handleChatSend).not.toHaveBeenCalled();
    expect(handleChatRead).not.toHaveBeenCalled();
    expect(handleNotificationSubscribe).not.toHaveBeenCalled();
    expect(handlePing).not.toHaveBeenCalled();
    expect(ensureDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(touchConnection).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(HttpStatusCode.OK);
    expect(JSON.parse(response.body ?? '{}')).toEqual({
      message: 'Action received on default route. No-op in phase 1.',
      action: 'unknown.action',
    });
  });
});
