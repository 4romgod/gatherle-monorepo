import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '@/utils/logger';
import { validateInput } from '@/validation';
import { NotificationSubscribePayloadSchema } from '@/validation/zod';
import { assertWebSocketRateLimit } from '@/websocket/abuseControl';
import { ensureDatabaseConnection } from '@/websocket/database';
import { getConnectionMetadata } from '@/websocket/event';
import { parseBody, response } from '@/websocket/response';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { touchConnection } from '@/websocket/routes/touch';
import { WEBSOCKET_ROUTES } from '@/websocket/constants';
import { HttpStatusCode } from '@/constants';

export const handleNotificationSubscribe = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  await ensureDatabaseConnection();
  const { connectionId } = getConnectionMetadata(event);
  const payload = parseBody<{ topics?: unknown }>(event.body);
  validateInput(NotificationSubscribePayloadSchema, payload ?? {});
  const parsedPayload = NotificationSubscribePayloadSchema.parse(payload ?? {});
  const topics = parsedPayload.topics ?? [];
  await assertWebSocketRateLimit(WEBSOCKET_ROUTES.NOTIFICATION_SUBSCRIBE, { connectionId });
  await touchConnection(event);

  if (topics.some((topic) => topic !== 'bell')) {
    logger.warn('Notification subscription rejected because an unsupported topic was requested', {
      connectionId,
      topics,
    });
    return response(HttpStatusCode.BAD_REQUEST, {
      message: 'Unsupported notification topic requested.',
    });
  }

  logger.info('Notification subscription acknowledged', {
    connectionId,
    topics,
  });

  return response(HttpStatusCode.OK, { message: 'Subscribed', topics });
};
