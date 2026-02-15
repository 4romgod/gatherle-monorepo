import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { WebSocketConnectionDAO } from '@/mongodb/dao';
import { HttpStatusCode } from '@/constants';
import { logger } from '@/utils/logger';
import { chatMessagingService } from '@/services';
import { ensureDatabaseConnection } from '@/websocket/database';
import { parseBody, response } from '@/websocket/response';
import { touchConnection } from '@/websocket/routes/touch';
import type { WebSocketRequestEvent } from '@/websocket/types';

interface ChatReadPayload {
  withUserId?: unknown;
}

export const handleChatRead = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  await ensureDatabaseConnection();
  const connectionId = await touchConnection(event);
  const payload = parseBody<ChatReadPayload>(event.body);

  // Validate payload
  const withUserId = typeof payload?.withUserId === 'string' ? payload.withUserId.trim() : '';
  if (!withUserId) {
    logger.warn('Chat read rejected because payload is invalid', {
      connectionId,
      payloadType: typeof payload,
    });
    return response(HttpStatusCode.BAD_REQUEST, {
      message: 'Invalid payload. withUserId is required.',
    });
  }

  // Get reader user ID from connection
  const readerConnection = await WebSocketConnectionDAO.readConnectionByConnectionId(connectionId);
  if (!readerConnection) {
    logger.warn('Chat read rejected because connection metadata was not found', { connectionId });
    return response(HttpStatusCode.UNAUTHENTICATED, {
      message: 'Connection is not registered. Reconnect and try again.',
    });
  }

  const readerUserId = readerConnection.userId;

  // Delegate to service
  const result = await chatMessagingService.markConversationAsRead(readerUserId, withUserId);

  return response(HttpStatusCode.OK, {
    message: 'Chat conversation marked as read',
    withUserId,
    markedCount: result.markedCount,
    deliveredCount: result.stats.readEventDeliveredCount,
    conversationDeliveredCount: result.stats.conversationDeliveredCount,
    unreadTotal: result.readerUnreadTotal,
    deliveredToReaderCount: result.stats.deliveredToReaderCount,
    deliveredToWithUserCount: result.stats.deliveredToWithUserCount,
  });
};
