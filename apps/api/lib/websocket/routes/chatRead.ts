import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { GraphQLError } from 'graphql';
import { HttpStatusCode } from '@/constants';
import { chatMessagingService } from '@/services';
import { validateInput } from '@/validation';
import { ChatReadPayloadSchema } from '@/validation/zod';
import { getConnectionMetadata } from '@/websocket/event';
import { assertWebSocketRateLimit } from '@/websocket/abuseControl';
import { WEBSOCKET_ROUTES } from '@/websocket/constants';
import { ensureDatabaseConnection } from '@/websocket/database';
import { graphQlErrorToResponse, parseBody, response } from '@/websocket/response';
import { touchConnection } from '@/websocket/routes/touch';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { readAuthorizedWebSocketConnection } from '@/websocket/access';

interface ChatReadPayload {
  withUserId?: unknown;
}

const toClientValidationResponse = (error: GraphQLError): APIGatewayProxyResultV2 =>
  response((error.extensions?.http as { status?: number } | undefined)?.status ?? HttpStatusCode.BAD_REQUEST, {
    message: error.message,
  });

export const handleChatRead = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  await ensureDatabaseConnection();
  const { connectionId } = getConnectionMetadata(event);
  const payload = parseBody<ChatReadPayload>(event.body);
  const withUserId = typeof payload?.withUserId === 'string' ? payload.withUserId.trim() : '';

  if (!withUserId) {
    return response(HttpStatusCode.BAD_REQUEST, {
      message: 'Invalid payload. withUserId is required.',
    });
  }

  try {
    validateInput(ChatReadPayloadSchema, { withUserId });
  } catch (error) {
    if (error instanceof GraphQLError) {
      return toClientValidationResponse(error);
    }
    throw error;
  }

  let readerConnection;
  try {
    readerConnection = await readAuthorizedWebSocketConnection(connectionId);
  } catch (error) {
    if (error instanceof GraphQLError) {
      return graphQlErrorToResponse(error);
    }
    throw error;
  }

  const readerUserId = readerConnection.userId;
  await assertWebSocketRateLimit(WEBSOCKET_ROUTES.CHAT_READ, { connectionId, userId: readerUserId });
  await touchConnection(event);

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
