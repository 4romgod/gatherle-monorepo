import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { GraphQLError } from 'graphql';
import { logger } from '@/utils/logger';
import { WEBSOCKET_ROUTES } from '@/websocket/constants';
import { ensureDatabaseConnection } from '@/websocket/database';
import { graphQlErrorToResponse, parseBody, response } from '@/websocket/response';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { handleChatRead } from '@/websocket/routes/chatRead';
import { handleChatSend } from '@/websocket/routes/chatSend';
import { handleNotificationSubscribe } from '@/websocket/routes/notificationSubscribe';
import { handlePing } from '@/websocket/routes/ping';
import { touchConnection } from '@/websocket/routes/touch';
import { HttpStatusCode } from '@/constants';
import { readAuthorizedWebSocketConnection } from '@/websocket/access';

export const handleDefault = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  const payload = parseBody<{ action?: unknown }>(event.body);
  const action = typeof payload?.action === 'string' ? payload.action.trim() : 'unknown';

  if (action === WEBSOCKET_ROUTES.CHAT_SEND) {
    logger.warn('Routing websocket action through $default fallback', { action });
    return handleChatSend(event);
  }

  if (action === WEBSOCKET_ROUTES.CHAT_READ) {
    logger.warn('Routing websocket action through $default fallback', { action });
    return handleChatRead(event);
  }

  if (action === WEBSOCKET_ROUTES.NOTIFICATION_SUBSCRIBE) {
    logger.warn('Routing websocket action through $default fallback', { action });
    return handleNotificationSubscribe(event);
  }

  if (action === WEBSOCKET_ROUTES.PING) {
    logger.warn('Routing websocket action through $default fallback', { action });
    return handlePing(event);
  }

  await ensureDatabaseConnection();
  let connectionId: string;
  try {
    const connection = await readAuthorizedWebSocketConnection(event.requestContext.connectionId);
    connectionId = connection.connectionId;
  } catch (error) {
    if (error instanceof GraphQLError) {
      return graphQlErrorToResponse(error);
    }
    throw error;
  }
  await touchConnection(event);

  logger.warn('Unhandled websocket action', { connectionId, action });

  return response(HttpStatusCode.BAD_REQUEST, {
    message: 'Unsupported websocket action.',
    action,
  });
};
