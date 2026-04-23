import type { APIGatewayProxyResultV2, Context, Handler } from 'aws-lambda';
import { logger } from '@/utils/logger';
import { WEBSOCKET_ROUTES } from '@/websocket/constants';
import { response } from '@/websocket/response';
import {
  handleChatRead,
  handleChatSend,
  handleConnect,
  handleDefault,
  handleDisconnect,
  handleNotificationSubscribe,
  handlePing,
} from '@/websocket/routes';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { HttpStatusCode } from '@/constants';

export const websocketLambdaHandler: Handler<WebSocketRequestEvent> = async (
  event: WebSocketRequestEvent,
  context: Context,
): Promise<APIGatewayProxyResultV2> => {
  // EventBridge warm-up pings don't carry WebSocket fields — return early without processing
  if (!(event as unknown as Record<string, unknown>).requestContext) {
    logger.info('Lambda warm-up ping received');
    return { statusCode: 200, body: JSON.stringify({ message: 'warm' }) };
  }

  logger.setRequestId(context.awsRequestId);

  try {
    const routeKey = event.requestContext.routeKey;
    logger.info('WebSocket lambda handler invoked', {
      routeKey,
      eventType: event.requestContext.eventType,
    });

    switch (routeKey) {
      case WEBSOCKET_ROUTES.CONNECT:
        return await handleConnect(event);
      case WEBSOCKET_ROUTES.DISCONNECT:
        return await handleDisconnect(event);
      case WEBSOCKET_ROUTES.NOTIFICATION_SUBSCRIBE:
        return await handleNotificationSubscribe(event);
      case WEBSOCKET_ROUTES.CHAT_SEND:
        return await handleChatSend(event);
      case WEBSOCKET_ROUTES.CHAT_READ:
        return await handleChatRead(event);
      case WEBSOCKET_ROUTES.PING:
        return await handlePing(event);
      case WEBSOCKET_ROUTES.DEFAULT:
      default:
        return await handleDefault(event);
    }
  } catch (error) {
    logger.error('Error handling WebSocket request', { error });
    return response(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      message: 'Internal server error',
    });
  } finally {
    logger.clearRequestId();
  }
};
