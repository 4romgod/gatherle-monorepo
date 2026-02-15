import { ChatMessageDAO, WebSocketConnectionDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { WEBSOCKET_EVENT_TYPES } from '@/websocket/constants';
import {
  createRealtimeEventEnvelope,
  deduplicateConnections,
  isGoneConnectionError,
  postToConnection,
  type WebSocketTargetConnection,
} from '@/websocket/gateway';

interface ChatMessageEventPayload {
  messageId: string;
  senderUserId: string;
  recipientUserId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ChatConversationUpdatedMessage {
  messageId: string;
  senderUserId: string;
  recipientUserId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ChatConversationUpdatedEventPayload {
  conversationWithUserId: string;
  unreadCount: number;
  unreadTotal: number;
  reason: 'chat.send' | 'chat.read';
  updatedAt: string;
  lastMessage: ChatMessageEventPayload | ChatConversationUpdatedMessage | null;
}

interface ChatReadEventPayload {
  readerUserId: string;
  withUserId: string;
  markedCount: number;
  readAt: string;
}

interface DeliveryStats {
  messageDeliveredCount: number;
  conversationDeliveredCount: number;
  readEventDeliveredCount: number;
  failedCount: number;
  staleCount: number;
  deliveredToReaderCount?: number;
  deliveredToWithUserCount?: number;
}

interface SendMessageResult {
  messageId: string;
  createdAt: string;
  isRead: boolean;
  recipientOnline: boolean;
  senderUnreadTotal: number;
  stats: DeliveryStats;
}

interface MarkConversationReadResult {
  markedCount: number;
  readerUnreadTotal: number;
  stats: DeliveryStats;
}

/**
 * Service for handling chat messaging operations including:
 * - Sending messages
 * - Marking conversations as read
 * - Delivering realtime WebSocket events
 * - Cleaning up stale connections
 */
export class ChatMessagingService {
  /**
   * Send a chat message from one user to another, save to database,
   * and deliver realtime events to all active connections
   */
  async sendMessage(senderUserId: string, recipientUserId: string, message: string): Promise<SendMessageResult> {
    // Fetch connections for both users
    const [recipientConnections, senderConnections] = await Promise.all([
      WebSocketConnectionDAO.readConnectionsByUserId(recipientUserId),
      WebSocketConnectionDAO.readConnectionsByUserId(senderUserId),
    ]);

    // Save message to database
    const chatMessage = await ChatMessageDAO.create({
      senderUserId,
      recipientUserId,
      message,
    });

    const messageId = chatMessage.chatMessageId;
    const createdAt = chatMessage.createdAt.toISOString();

    // Create message event payload
    const messageEventPayload = createRealtimeEventEnvelope<ChatMessageEventPayload>(
      WEBSOCKET_EVENT_TYPES.CHAT_MESSAGE,
      {
        messageId,
        senderUserId,
        recipientUserId,
        message,
        isRead: chatMessage.isRead,
        createdAt,
      },
    );

    // Fetch unread counts for both users
    const [senderUnreadCount, recipientUnreadCount, senderUnreadTotal, recipientUnreadTotal] = await Promise.all([
      ChatMessageDAO.countUnreadForConversation(senderUserId, recipientUserId),
      ChatMessageDAO.countUnreadForConversation(recipientUserId, senderUserId),
      ChatMessageDAO.countUnreadTotal(senderUserId),
      ChatMessageDAO.countUnreadTotal(recipientUserId),
    ]);

    // Deliver to all unique connections
    const targetConnections = deduplicateConnections(recipientConnections, senderConnections);
    const stats = await this.deliverChatMessageEvents(targetConnections, messageEventPayload, {
      senderUserId,
      recipientUserId,
      senderUnreadCount,
      recipientUnreadCount,
      senderUnreadTotal,
      recipientUnreadTotal,
      createdAt,
      messageId,
      message,
      isRead: chatMessage.isRead,
    });

    logger.info('Chat message sent and delivered', {
      senderUserId,
      recipientUserId,
      messageId,
      messageLength: message.length,
      recipientConnections: recipientConnections.length,
      senderUnreadCount,
      recipientUnreadCount,
      senderUnreadTotal,
      recipientUnreadTotal,
      ...stats,
    });

    return {
      messageId,
      createdAt,
      isRead: chatMessage.isRead,
      recipientOnline: recipientConnections.length > 0,
      senderUnreadTotal,
      stats,
    };
  }

  /**
   * Mark all messages in a conversation as read and broadcast
   * realtime events to all active connections
   */
  async markConversationAsRead(readerUserId: string, withUserId: string): Promise<MarkConversationReadResult> {
    // Mark messages as read in database
    const markedCount = await ChatMessageDAO.markConversationRead(readerUserId, withUserId);

    // Fetch connections and stats
    const [
      readerConnections,
      withUserConnections,
      readerUnreadCount,
      withUserUnreadCount,
      readerUnreadTotal,
      withUserUnreadTotal,
      latestMessage,
    ] = await Promise.all([
      WebSocketConnectionDAO.readConnectionsByUserId(readerUserId),
      WebSocketConnectionDAO.readConnectionsByUserId(withUserId),
      ChatMessageDAO.countUnreadForConversation(readerUserId, withUserId),
      ChatMessageDAO.countUnreadForConversation(withUserId, readerUserId),
      ChatMessageDAO.countUnreadTotal(readerUserId),
      ChatMessageDAO.countUnreadTotal(withUserId),
      ChatMessageDAO.readLatestInConversation(readerUserId, withUserId),
    ]);

    const readAt = new Date().toISOString();
    const updatedAt = latestMessage?.createdAt?.toISOString() ?? readAt;

    const lastMessagePayload: ChatConversationUpdatedMessage | null = latestMessage
      ? {
          messageId: latestMessage.chatMessageId,
          senderUserId: latestMessage.senderUserId,
          recipientUserId: latestMessage.recipientUserId,
          message: latestMessage.message,
          isRead: latestMessage.isRead,
          createdAt: latestMessage.createdAt.toISOString(),
        }
      : null;

    // Create read event payload
    const readEventPayload = createRealtimeEventEnvelope<ChatReadEventPayload>(WEBSOCKET_EVENT_TYPES.CHAT_READ, {
      readerUserId,
      withUserId,
      markedCount,
      readAt,
    });

    // Deliver to all unique connections
    const targetConnections = deduplicateConnections(readerConnections, withUserConnections);
    const stats = await this.deliverChatReadEvents(targetConnections, readEventPayload, {
      readerUserId,
      withUserId,
      readerUnreadCount,
      withUserUnreadCount,
      readerUnreadTotal,
      withUserUnreadTotal,
      updatedAt,
      lastMessagePayload,
    });

    logger.info('Chat conversation marked as read', {
      readerUserId,
      withUserId,
      markedCount,
      readerConnections: readerConnections.length,
      withUserConnections: withUserConnections.length,
      readerUnreadCount,
      withUserUnreadCount,
      readerUnreadTotal,
      withUserUnreadTotal,
      ...stats,
    });

    return {
      markedCount,
      readerUnreadTotal,
      stats,
    };
  }

  /**
   * Deliver chat message and conversation updated events to all target connections
   */
  private async deliverChatMessageEvents(
    targetConnections: Map<string, WebSocketTargetConnection & { userId: string }>,
    messageEventPayload: ReturnType<typeof createRealtimeEventEnvelope<ChatMessageEventPayload>>,
    context: {
      senderUserId: string;
      recipientUserId: string;
      senderUnreadCount: number;
      recipientUnreadCount: number;
      senderUnreadTotal: number;
      recipientUnreadTotal: number;
      createdAt: string;
      messageId: string;
      message: string;
      isRead: boolean;
    },
  ): Promise<DeliveryStats> {
    let messageDeliveredCount = 0;
    let conversationDeliveredCount = 0;
    let failedCount = 0;
    let staleCount = 0;

    await Promise.all(
      [...targetConnections.values()].map(async (connection) => {
        const isSenderConnection = connection.userId === context.senderUserId;

        const conversationUpdatedEventPayload = createRealtimeEventEnvelope<ChatConversationUpdatedEventPayload>(
          WEBSOCKET_EVENT_TYPES.CHAT_CONVERSATION_UPDATED,
          {
            conversationWithUserId: isSenderConnection ? context.recipientUserId : context.senderUserId,
            unreadCount: isSenderConnection ? context.senderUnreadCount : context.recipientUnreadCount,
            unreadTotal: isSenderConnection ? context.senderUnreadTotal : context.recipientUnreadTotal,
            reason: 'chat.send',
            updatedAt: context.createdAt,
            lastMessage: {
              messageId: context.messageId,
              senderUserId: context.senderUserId,
              recipientUserId: context.recipientUserId,
              message: context.message,
              isRead: context.isRead,
              createdAt: context.createdAt,
            },
          },
        );

        try {
          await postToConnection(connection, messageEventPayload);
          messageDeliveredCount += 1;

          await postToConnection(connection, conversationUpdatedEventPayload);
          conversationDeliveredCount += 1;
        } catch (error) {
          if (isGoneConnectionError(error)) {
            staleCount += 1;
            await this.cleanupStaleConnection(connection.connectionId, context.senderUserId, context.recipientUserId);
            return;
          }

          failedCount += 1;
          logger.warn('Failed to deliver websocket chat message', {
            connectionId: connection.connectionId,
            senderUserId: context.senderUserId,
            recipientUserId: context.recipientUserId,
            error,
          });
        }
      }),
    );

    return {
      messageDeliveredCount,
      conversationDeliveredCount,
      readEventDeliveredCount: 0,
      failedCount,
      staleCount,
    };
  }

  /**
   * Deliver chat read and conversation updated events to all target connections
   */
  private async deliverChatReadEvents(
    targetConnections: Map<string, WebSocketTargetConnection & { userId: string }>,
    readEventPayload: ReturnType<typeof createRealtimeEventEnvelope<ChatReadEventPayload>>,
    context: {
      readerUserId: string;
      withUserId: string;
      readerUnreadCount: number;
      withUserUnreadCount: number;
      readerUnreadTotal: number;
      withUserUnreadTotal: number;
      updatedAt: string;
      lastMessagePayload: ChatConversationUpdatedMessage | null;
    },
  ): Promise<DeliveryStats> {
    let readEventDeliveredCount = 0;
    let conversationDeliveredCount = 0;
    let failedCount = 0;
    let staleCount = 0;
    let deliveredToReaderCount = 0;
    let deliveredToWithUserCount = 0;

    await Promise.all(
      [...targetConnections.values()].map(async (connection) => {
        const isReaderConnection = connection.userId === context.readerUserId;

        const conversationUpdatedEventPayload = createRealtimeEventEnvelope<ChatConversationUpdatedEventPayload>(
          WEBSOCKET_EVENT_TYPES.CHAT_CONVERSATION_UPDATED,
          {
            conversationWithUserId: isReaderConnection ? context.withUserId : context.readerUserId,
            unreadCount: isReaderConnection ? context.readerUnreadCount : context.withUserUnreadCount,
            unreadTotal: isReaderConnection ? context.readerUnreadTotal : context.withUserUnreadTotal,
            reason: 'chat.read',
            updatedAt: context.updatedAt,
            lastMessage: context.lastMessagePayload,
          },
        );

        try {
          await postToConnection(connection, readEventPayload);
          readEventDeliveredCount += 1;

          if (isReaderConnection) {
            deliveredToReaderCount += 1;
          }
          if (connection.userId === context.withUserId) {
            deliveredToWithUserCount += 1;
          }

          await postToConnection(connection, conversationUpdatedEventPayload);
          conversationDeliveredCount += 1;
        } catch (error) {
          if (isGoneConnectionError(error)) {
            staleCount += 1;
            await this.cleanupStaleConnection(connection.connectionId, context.readerUserId, context.withUserId);
            return;
          }

          failedCount += 1;
          logger.warn('Failed to broadcast websocket chat read event', {
            connectionId: connection.connectionId,
            readerUserId: context.readerUserId,
            withUserId: context.withUserId,
            error,
          });
        }
      }),
    );

    return {
      messageDeliveredCount: 0,
      conversationDeliveredCount,
      readEventDeliveredCount,
      failedCount,
      staleCount,
      deliveredToReaderCount,
      deliveredToWithUserCount,
    };
  }

  /**
   * Remove a stale WebSocket connection from the database
   */
  private async cleanupStaleConnection(
    connectionId: string,
    primaryUserId: string,
    secondaryUserId: string,
  ): Promise<void> {
    await WebSocketConnectionDAO.removeConnection(connectionId);
    logger.info('Removed stale websocket connection', {
      connectionId,
      primaryUserId,
      secondaryUserId,
    });
  }
}

// Export singleton instance
export const chatMessagingService = new ChatMessagingService();
