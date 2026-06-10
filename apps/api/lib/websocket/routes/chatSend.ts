import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { GraphQLError } from 'graphql';
import { EventMomentType } from '@gatherle/commons/server/types';
import { logger } from '@/utils/logger';
import { chatMessagingService } from '@/services';
import { CHAT_MESSAGE_MAX_LENGTH, WEBSOCKET_ROUTES } from '@/websocket/constants';
import { validateInput } from '@/validation';
import { ChatSendPayloadSchema } from '@/validation/zod';
import { getConnectionMetadata } from '@/websocket/event';
import { assertWebSocketRateLimit } from '@/websocket/abuseControl';

const MOMENT_CAPTION_MAX_LENGTH = 280;
const VALID_MOMENT_TYPES = new Set<string>(Object.values(EventMomentType));
import { ensureDatabaseConnection } from '@/websocket/database';
import { graphQlErrorToResponse, parseBody, response } from '@/websocket/response';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { touchConnection } from '@/websocket/routes/touch';
import { HttpStatusCode } from '@/constants';
import { readAuthorizedWebSocketConnection } from '@/websocket/access';

interface ChatSendPayload {
  recipientUserId?: unknown;
  message?: unknown;
  replyToMomentId?: unknown;
  replyToMomentCaption?: unknown;
  replyToMomentType?: unknown;
}

const toClientValidationResponse = (error: GraphQLError): APIGatewayProxyResultV2 =>
  response((error.extensions?.http as { status?: number } | undefined)?.status ?? HttpStatusCode.BAD_REQUEST, {
    message: error.message,
  });

export const handleChatSend = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  await ensureDatabaseConnection();
  const { connectionId } = getConnectionMetadata(event);
  const payload = parseBody<ChatSendPayload>(event.body);
  const recipientUserId = typeof payload?.recipientUserId === 'string' ? payload.recipientUserId.trim() : '';
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';

  if (!recipientUserId || !message) {
    return response(HttpStatusCode.BAD_REQUEST, {
      message: 'Invalid payload. recipientUserId and message are required.',
    });
  }

  const replyToMomentId =
    typeof payload?.replyToMomentId === 'string' ? payload.replyToMomentId.trim() || undefined : undefined;
  const replyToMomentCaption = (() => {
    if (typeof payload?.replyToMomentCaption !== 'string') return undefined;
    const trimmed = payload.replyToMomentCaption.trim().slice(0, MOMENT_CAPTION_MAX_LENGTH);
    return trimmed || undefined;
  })();
  const replyToMomentType = (() => {
    if (typeof payload?.replyToMomentType !== 'string') return undefined;
    const normalised = payload.replyToMomentType.trim().toLowerCase();
    return VALID_MOMENT_TYPES.has(normalised) ? (normalised as EventMomentType) : undefined;
  })();

  try {
    validateInput(ChatSendPayloadSchema, {
      recipientUserId,
      message,
      ...(replyToMomentId ? { replyToMomentId } : {}),
      ...(replyToMomentCaption ? { replyToMomentCaption } : {}),
      ...(replyToMomentType ? { replyToMomentType } : {}),
    });
  } catch (error) {
    if (error instanceof GraphQLError) {
      return toClientValidationResponse(error);
    }
    throw error;
  }

  if (message.length > CHAT_MESSAGE_MAX_LENGTH) {
    logger.warn('Chat send rejected because message exceeded max length', {
      connectionId,
      messageLength: message.length,
      maxLength: CHAT_MESSAGE_MAX_LENGTH,
    });
    return response(HttpStatusCode.BAD_REQUEST, {
      message: `Message exceeds max length of ${CHAT_MESSAGE_MAX_LENGTH} characters.`,
    });
  }

  let senderConnection;
  try {
    senderConnection = await readAuthorizedWebSocketConnection(connectionId);
  } catch (error) {
    if (error instanceof GraphQLError) {
      return graphQlErrorToResponse(error);
    }
    throw error;
  }

  const senderUserId = senderConnection.userId;
  await assertWebSocketRateLimit(WEBSOCKET_ROUTES.CHAT_SEND, { connectionId, userId: senderUserId });
  await touchConnection(event);

  // Delegate to service
  const result = await chatMessagingService.sendMessage(senderUserId, recipientUserId, message, {
    replyToMomentId,
    replyToMomentCaption,
    replyToMomentType,
  });

  return response(HttpStatusCode.OK, {
    message: 'Chat message processed',
    messageId: result.messageId,
    createdAt: result.createdAt,
    isRead: result.isRead,
    recipientUserId,
    deliveredCount: result.stats.messageDeliveredCount,
    conversationDeliveredCount: result.stats.conversationDeliveredCount,
    unreadTotal: result.senderUnreadTotal,
    recipientOnline: result.recipientOnline,
  });
};
