import WebSocket from 'ws';
import { usersMockData } from '@/mongodb/mockData';
import { WebSocketCloseCode } from '@/constants';
import { WEBSOCKET_AUTH_PROTOCOL_PREFIX } from '@/websocket/constants';
import type { CreateUserInput, UserWithToken } from '@gatherle/commons/types';
import { getSeededTestUsers, loginSeededUser } from '@/test/e2e/utils/helpers';
import { assertNoCleanupFailures } from '@/test/e2e/utils/eventSeriesResolverHelpers';
import {
  buildCreateUserInput,
  cleanupUsersById,
  createUserOnServer,
  uniqueSuffix,
} from '@/test/e2e/utils/userResolverHelpers';

const OPEN_SOCKET_TIMEOUT_MS = 5_000;
const CLOSE_SOCKET_TIMEOUT_MS = 5_000;

const buildLocalWebSocketUrl = (graphqlUrl: string): string => {
  const url = new URL(graphqlUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/local`;
};

const waitForSocketOpen = (socket: WebSocket, timeoutMs = OPEN_SOCKET_TIMEOUT_MS): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for websocket connection to open.'));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('open', handleOpen);
      socket.off('error', handleError);
      socket.off('close', handleClose);
    };

    const handleOpen = () => {
      cleanup();
      resolve();
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const handleClose = (code: number, reason: Buffer) => {
      cleanup();
      reject(new Error(`WebSocket closed before open with code ${code}: ${reason.toString('utf8')}`));
    };

    socket.once('open', handleOpen);
    socket.once('error', handleError);
    socket.once('close', handleClose);
  });

const waitForSocketClose = (
  socket: WebSocket,
  timeoutMs = CLOSE_SOCKET_TIMEOUT_MS,
): Promise<{ code: number; reason: string }> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for websocket connection to close.'));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('close', handleClose);
      socket.off('error', handleError);
    };

    const handleClose = (code: number, reason: Buffer) => {
      cleanup();
      resolve({ code, reason: reason.toString('utf8') });
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once('close', handleClose);
    socket.once('error', handleError);
  });

const closeSocketQuietly = async (socket: WebSocket): Promise<void> => {
  if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, 2_000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('close', handleClose);
    };

    const handleClose = () => {
      cleanup();
      resolve();
    };

    socket.once('close', handleClose);

    try {
      socket.close();
    } catch {
      cleanup();
      resolve();
    }
  });
};

const isLocalGraphQlTarget = (graphqlUrl: string) => {
  if (!graphqlUrl.trim()) {
    return false;
  }

  return /localhost|127\.0\.0\.1/i.test(new URL(graphqlUrl).hostname);
};

const describeLocalWebSocket = isLocalGraphQlTarget(process.env.GRAPHQL_URL ?? '') ? describe : describe.skip;

describeLocalWebSocket('WebSocket security hardening (local only)', () => {
  const graphqlUrl = process.env.GRAPHQL_URL!;
  const websocketUrl = buildLocalWebSocketUrl(graphqlUrl);
  const testPassword = 'testPassword';
  let adminToken: string;
  const createdUserIds: string[] = [];
  const openSockets = new Set<WebSocket>();

  const newUserInput = (suffix = uniqueSuffix()): CreateUserInput =>
    buildCreateUserInput(usersMockData.at(0)! as CreateUserInput, testPassword, suffix);

  const createAuthenticatedSocket = (token: string) =>
    new WebSocket(websocketUrl, [`${WEBSOCKET_AUTH_PROTOCOL_PREFIX}${token}`]);

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    const admin: UserWithToken = await loginSeededUser(graphqlUrl, seededUsers.admin.email, seededUsers.admin.password);
    adminToken = admin.token;
  });

  afterEach(async () => {
    await Promise.all(Array.from(openSockets).map(async (socket) => closeSocketQuietly(socket)));
    openSockets.clear();
    await cleanupUsersById(graphqlUrl, adminToken, createdUserIds);
  });

  afterAll(async () => {
    const failures = await cleanupUsersById(graphqlUrl, adminToken, createdUserIds, 'afterAll');
    assertNoCleanupFailures(failures);
  });

  it('rejects websocket connects that omit a valid auth protocol token', async () => {
    const socket = new WebSocket(websocketUrl);
    const closeEvent = await waitForSocketClose(socket);

    expect(closeEvent.code).toBe(WebSocketCloseCode.APP_UNAUTHORIZED);
    expect(closeEvent.reason).toBe('Unauthorized');
  });

  it('throttles repeated $connect attempts per user and does not spill over to a different user', async () => {
    const firstUser = await createUserOnServer(graphqlUrl, newUserInput('ws-a-' + uniqueSuffix()), createdUserIds);
    const secondUser = await createUserOnServer(graphqlUrl, newUserInput('ws-b-' + uniqueSuffix()), createdUserIds);
    const firstUserProtocol = `${WEBSOCKET_AUTH_PROTOCOL_PREFIX}${firstUser.token}`;
    const secondUserProtocol = `${WEBSOCKET_AUTH_PROTOCOL_PREFIX}${secondUser.token}`;

    for (let attempt = 1; attempt <= 12; attempt++) {
      const socket = createAuthenticatedSocket(firstUser.token);
      openSockets.add(socket);

      await waitForSocketOpen(socket);
      expect(socket.readyState).toBe(WebSocket.OPEN);
      expect(socket.protocol).toBe(firstUserProtocol);
    }

    const throttledSocket = createAuthenticatedSocket(firstUser.token);
    const throttledClose = await waitForSocketClose(throttledSocket);
    expect(throttledClose.code).toBe(WebSocketCloseCode.APP_BAD_REQUEST);
    expect(throttledClose.reason).toBe('Bad request');

    const otherUserSocket = createAuthenticatedSocket(secondUser.token);
    openSockets.add(otherUserSocket);
    await waitForSocketOpen(otherUserSocket);
    expect(otherUserSocket.readyState).toBe(WebSocket.OPEN);
    expect(otherUserSocket.protocol).toBe(secondUserProtocol);
  });
});
