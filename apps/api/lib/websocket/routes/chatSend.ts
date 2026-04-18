import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { EventMomentType } from '@gatherle/commons/types';
import { WebSocketConnectionDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { chatMessagingService } from '@/services';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/websocket/constants';

const MOMENT_CAPTION_MAX_LENGTH = 280;
const VALID_MOMENT_TYPES = new Set<string>(Object.values(EventMomentType));
import { ensureDatabaseConnection } from '@/websocket/database';
import { parseBody, response } from '@/websocket/response';
import type { WebSocketRequestEvent } from '@/websocket/types';
import { touchConnection } from '@/websocket/routes/touch';
import { HttpStatusCode } from '@/constants';

interface ChatSendPayload {
  recipientUserId?: unknown;
  message?: unknown;
  replyToMomentId?: unknown;
  replyToMomentCaption?: unknown;
  replyToMomentType?: unknown;
}

export const handleChatSend = async (event: WebSocketRequestEvent): Promise<APIGatewayProxyResultV2> => {
  await ensureDatabaseConnection();
  const connectionId = await touchConnection(event);
  const payload = parseBody<ChatSendPayload>(event.body);

  // Validate payload
  const recipientUserId = typeof payload?.recipientUserId === 'string' ? payload.recipientUserId.trim() : '';
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
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

  if (!recipientUserId || !message) {
    logger.warn('Chat send rejected because payload is invalid', {
      connectionId,
      hasRecipientUserId: Boolean(recipientUserId),
      hasMessage: Boolean(message),
      payloadType: typeof payload,
    });
    return response(HttpStatusCode.BAD_REQUEST, {
      message: 'Invalid payload. recipientUserId and message are required.',
    });
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

  // Get sender user ID from connection
  const senderConnection = await WebSocketConnectionDAO.readConnectionByConnectionId(connectionId);
  if (!senderConnection) {
    logger.warn('Chat send rejected because connection metadata was not found', { connectionId });
    return response(HttpStatusCode.UNAUTHENTICATED, {
      message: 'Connection is not registered. Reconnect and try again.',
    });
  }

  const senderUserId = senderConnection.userId;

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
