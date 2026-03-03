import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { verifyToken } from '@/utils/auth';
import type { AuthClaims } from '@/utils/auth';
import { logger } from '@/utils/logger';
import { CONNECTION_TTL_HOURS, WEBSOCKET_AUTH_PROTOCOL_PREFIX } from '@/websocket/constants';
import { ensureDatabaseConnection } from '@/websocket/database';
import { extractToken, getConnectionMetadata, getHeader } from '@/websocket/event';
import { response } from '@/websocket/response';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { WebSocketConnectionDAO } from '@/mongodb/dao';
import { HttpStatusCode } from '@/constants';

const extractAuthProtocol = (event: WebSocketRequestEvent): string | undefined => {
  const protocolHeader = getHeader(event.headers, 'sec-websocket-protocol');
  if (!protocolHeader) {
    return undefined;
  }
  return protocolHeader
    .split(',')
    .map((p) => p.trim())
    .find((p) => p.startsWith(WEBSOCKET_AUTH_PROTOCOL_PREFIX));
};

export const handleConnect = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  const token = extractToken(event);
  if (!token) {
    logger.warn('WebSocket connect rejected because auth token is missing', {
      connectionId: event.requestContext.connectionId,
      routeKey: event.requestContext.routeKey,
    });
    return response(HttpStatusCode.UNAUTHENTICATED, {
      message: 'Missing auth token. Provide Authorization or Sec-WebSocket-Protocol header.',
    });
  }

  let user: AuthClaims;
  try {
    user = await verifyToken(token);
  } catch (error) {
    logger.warn('WebSocket connect rejected because auth token verification failed', {
      connectionId: event.requestContext.connectionId,
      routeKey: event.requestContext.routeKey,
      error,
    });
    return response(HttpStatusCode.UNAUTHENTICATED, { message: 'Invalid auth token.' });
  }

  if (!user.userId) {
    logger.warn('WebSocket connect rejected because token payload did not include userId', {
      connectionId: event.requestContext.connectionId,
      routeKey: event.requestContext.routeKey,
    });
    return response(HttpStatusCode.UNAUTHENTICATED, { message: 'Invalid auth token.' });
  }

  await ensureDatabaseConnection();

  const { connectionId, domainName, stage } = getConnectionMetadata(event);

  await WebSocketConnectionDAO.upsertConnection({
    connectionId,
    userId: user.userId,
    domainName,
    stage,
    ttlHours: CONNECTION_TTL_HOURS,
  });

  logger.info('WebSocket client connected', {
    connectionId,
    userId: user.userId,
    stage,
  });

  const authProtocol = extractAuthProtocol(event);
  const responseHeaders = authProtocol ? { 'Sec-WebSocket-Protocol': authProtocol } : undefined;
  return response(HttpStatusCode.OK, { message: 'Connected' }, responseHeaders);
};
