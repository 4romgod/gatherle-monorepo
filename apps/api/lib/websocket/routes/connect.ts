import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { GraphQLError } from 'graphql';
import { verifyToken } from '@/utils/auth';
import type { AuthClaims } from '@/utils/auth';
import { logger } from '@/utils/logger';
import { CONNECTION_TTL_HOURS, WEBSOCKET_AUTH_PROTOCOL_PREFIX, WEBSOCKET_ROUTES } from '@/websocket/constants';
import { ensureDatabaseConnection } from '@/websocket/database';
import {
  extractDeviceInstallationId,
  extractToken,
  findProtocolByPrefix,
  getConnectionMetadata,
} from '@/websocket/event';
import { graphQlErrorToResponse, response } from '@/websocket/response';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { WebSocketConnectionDAO } from '@/mongodb/dao';
import { assertWebSocketRateLimit } from '@/websocket/abuseControl';
import { HttpStatusCode } from '@/constants';
import { assertWebSocketAccessAllowed } from '@/websocket/access';

const extractAuthProtocol = (event: WebSocketRequestEvent): string | undefined =>
  findProtocolByPrefix(event, WEBSOCKET_AUTH_PROTOCOL_PREFIX);

export const handleConnect = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  const token = extractToken(event);
  if (!token) {
    logger.warn('WebSocket connect rejected because auth token is missing', {
      connectionId: event.requestContext.connectionId,
      routeKey: event.requestContext.routeKey,
    });
    return response(HttpStatusCode.UNAUTHENTICATED, {
      message: 'Missing auth token. Provide Sec-WebSocket-Protocol auth.',
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
  await assertWebSocketRateLimit(WEBSOCKET_ROUTES.CONNECT, { userId: user.userId });

  const { connectionId, domainName, stage } = getConnectionMetadata(event);
  const deviceInstallationId = extractDeviceInstallationId(event);

  try {
    await assertWebSocketAccessAllowed({
      deviceInstallationId,
      userId: user.userId,
    });
  } catch (error) {
    if (error instanceof GraphQLError) {
      return graphQlErrorToResponse(error);
    }
    throw error;
  }

  await WebSocketConnectionDAO.upsertConnection({
    connectionId,
    deviceInstallationId,
    userId: user.userId,
    domainName,
    stage,
    ttlHours: CONNECTION_TTL_HOURS,
  });

  logger.info('WebSocket client connected', {
    connectionId,
    deviceInstallationId,
    userId: user.userId,
    stage,
  });

  const authProtocol = extractAuthProtocol(event);
  const responseHeaders = authProtocol ? { 'Sec-WebSocket-Protocol': authProtocol } : undefined;
  return response(HttpStatusCode.OK, { message: 'Connected' }, responseHeaders);
};
