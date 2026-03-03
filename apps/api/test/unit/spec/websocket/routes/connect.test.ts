import { HttpStatusCode } from '@/constants';
import { verifyToken } from '@/utils/auth';
import { ensureDatabaseConnection } from '@/websocket/database';
import { extractToken, getConnectionMetadata } from '@/websocket/event';
import { handleConnect } from '@/websocket/routes/connect';
import { WebSocketConnectionDAO } from '@/mongodb/dao';

jest.mock('@/utils/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  initLogger: jest.fn(),
}));

jest.mock('@/websocket/database', () => ({
  ensureDatabaseConnection: jest.fn(),
}));

jest.mock('@/websocket/event', () => ({
  ...jest.requireActual('@/websocket/event'),
  extractToken: jest.fn(),
  getConnectionMetadata: jest.fn(),
}));

jest.mock('@/mongodb/dao', () => ({
  WebSocketConnectionDAO: {
    upsertConnection: jest.fn(),
  },
}));

const baseRequestContext = {
  connectionId: 'conn-123',
  domainName: 'abc.execute-api.af-south-1.amazonaws.com',
  stage: 'beta',
  routeKey: '$connect',
};

const makeEvent = (headers: Record<string, string> = {}) => ({ requestContext: baseRequestContext, headers }) as any;

describe('websocket route: connect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
    (verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-abc' });
    (getConnectionMetadata as jest.Mock).mockReturnValue({
      connectionId: 'conn-123',
      domainName: 'abc.execute-api.af-south-1.amazonaws.com',
      stage: 'beta',
    });
    (WebSocketConnectionDAO.upsertConnection as jest.Mock).mockResolvedValue(undefined);
  });

  describe('auth token validation', () => {
    it('returns 401 when no token is present', async () => {
      (extractToken as jest.Mock).mockReturnValue(undefined);

      const result = (await handleConnect(makeEvent())) as { statusCode: number; body: string };

      expect(result.statusCode).toBe(HttpStatusCode.UNAUTHENTICATED);
      expect(JSON.parse(result.body)).toMatchObject({ message: expect.stringContaining('Missing auth token') });
      expect(ensureDatabaseConnection).not.toHaveBeenCalled();
    });

    it('returns 401 when token verification fails', async () => {
      (extractToken as jest.Mock).mockReturnValue('bad-token');
      (verifyToken as jest.Mock).mockRejectedValue(new Error('invalid signature'));

      const result = (await handleConnect(makeEvent())) as { statusCode: number; body: string };

      expect(result.statusCode).toBe(HttpStatusCode.UNAUTHENTICATED);
      expect(JSON.parse(result.body)).toMatchObject({ message: 'Invalid auth token.' });
      expect(ensureDatabaseConnection).not.toHaveBeenCalled();
    });

    it('returns 401 when token has no userId', async () => {
      (extractToken as jest.Mock).mockReturnValue('token-no-user');
      (verifyToken as jest.Mock).mockResolvedValue({ userId: undefined });

      const result = (await handleConnect(makeEvent())) as { statusCode: number; body: string };

      expect(result.statusCode).toBe(HttpStatusCode.UNAUTHENTICATED);
      expect(JSON.parse(result.body)).toMatchObject({ message: 'Invalid auth token.' });
      expect(ensureDatabaseConnection).not.toHaveBeenCalled();
    });
  });

  describe('successful connection', () => {
    beforeEach(() => {
      (extractToken as jest.Mock).mockReturnValue('valid-token');
    });

    it('connects and upserts the connection record', async () => {
      const result = (await handleConnect(makeEvent())) as { statusCode: number; body: string };

      expect(ensureDatabaseConnection).toHaveBeenCalledTimes(1);
      expect(WebSocketConnectionDAO.upsertConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: 'conn-123',
          userId: 'user-abc',
          domainName: 'abc.execute-api.af-south-1.amazonaws.com',
          stage: 'beta',
        }),
      );
      expect(result.statusCode).toBe(HttpStatusCode.OK);
    });

    describe('extractAuthProtocol / Sec-WebSocket-Protocol response header', () => {
      it('includes Sec-WebSocket-Protocol header when lowercase sec-websocket-protocol header contains auth protocol', async () => {
        const event = makeEvent({ 'sec-websocket-protocol': 'gatherle.jwt.my-token' });

        const result = (await handleConnect(event)) as {
          statusCode: number;
          headers?: Record<string, string>;
          body: string;
        };

        expect(result.statusCode).toBe(HttpStatusCode.OK);
        expect(result.headers?.['Sec-WebSocket-Protocol']).toBe('gatherle.jwt.my-token');
      });

      it('includes Sec-WebSocket-Protocol header when PascalCase Sec-WebSocket-Protocol header contains auth protocol', async () => {
        const event = makeEvent({ 'Sec-WebSocket-Protocol': 'gatherle.jwt.my-token' });

        const result = (await handleConnect(event)) as {
          statusCode: number;
          headers?: Record<string, string>;
          body: string;
        };

        expect(result.statusCode).toBe(HttpStatusCode.OK);
        expect(result.headers?.['Sec-WebSocket-Protocol']).toBe('gatherle.jwt.my-token');
      });

      it('picks the auth protocol from a comma-separated list', async () => {
        const event = makeEvent({ 'sec-websocket-protocol': 'graphql-ws, gatherle.jwt.my-token, chat' });

        const result = (await handleConnect(event)) as {
          statusCode: number;
          headers?: Record<string, string>;
          body: string;
        };

        expect(result.statusCode).toBe(HttpStatusCode.OK);
        expect(result.headers?.['Sec-WebSocket-Protocol']).toBe('gatherle.jwt.my-token');
      });

      it('omits Sec-WebSocket-Protocol header when no sec-websocket-protocol header is present', async () => {
        const result = (await handleConnect(makeEvent())) as {
          statusCode: number;
          headers?: Record<string, string>;
          body: string;
        };

        expect(result.statusCode).toBe(HttpStatusCode.OK);
        expect(result.headers?.['Sec-WebSocket-Protocol']).toBeUndefined();
      });

      it('omits Sec-WebSocket-Protocol header when header value does not match the auth prefix', async () => {
        const event = makeEvent({ 'sec-websocket-protocol': 'graphql-ws, chat' });

        const result = (await handleConnect(event)) as {
          statusCode: number;
          headers?: Record<string, string>;
          body: string;
        };

        expect(result.statusCode).toBe(HttpStatusCode.OK);
        expect(result.headers?.['Sec-WebSocket-Protocol']).toBeUndefined();
      });
    });
  });
});
