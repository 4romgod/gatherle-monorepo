type RealtimeEnvelope = {
  payload?: unknown;
  type?: unknown;
};

export type ChatRealtimeEventType = 'chat.message' | 'chat.read' | 'chat.conversation.updated';

export interface ChatMessageRealtimePayload {
  createdAt: string;
  isRead: boolean;
  message: string;
  messageId: string;
  recipientUserId: string;
  senderUserId: string;
}

export interface ChatReadRealtimePayload {
  markedCount: number;
  readAt: string;
  readerUserId: string;
  withUserId: string;
}

export interface ChatConversationUpdatedRealtimePayload {
  conversationWithUserId: string;
  lastMessage: ChatMessageRealtimePayload | null;
  reason: 'chat.send' | 'chat.read';
  unreadCount: number;
  unreadTotal: number;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const isChatMessagePayload = (value: unknown): value is ChatMessageRealtimePayload => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.messageId === 'string' &&
    typeof value.senderUserId === 'string' &&
    typeof value.recipientUserId === 'string' &&
    typeof value.message === 'string' &&
    typeof value.isRead === 'boolean' &&
    typeof value.createdAt === 'string'
  );
};

export const isChatReadPayload = (value: unknown): value is ChatReadRealtimePayload => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.readerUserId === 'string' &&
    typeof value.withUserId === 'string' &&
    typeof value.markedCount === 'number' &&
    typeof value.readAt === 'string'
  );
};

export const isChatConversationUpdatedPayload = (value: unknown): value is ChatConversationUpdatedRealtimePayload => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.conversationWithUserId === 'string' &&
    typeof value.unreadCount === 'number' &&
    typeof value.unreadTotal === 'number' &&
    (value.reason === 'chat.send' || value.reason === 'chat.read') &&
    typeof value.updatedAt === 'string' &&
    (value.lastMessage === null || isChatMessagePayload(value.lastMessage))
  );
};

const isChatRealtimeEventType = (value: unknown): value is ChatRealtimeEventType => {
  return value === 'chat.message' || value === 'chat.read' || value === 'chat.conversation.updated';
};

export const parseChatRealtimeEvent = (data: string): { payload: unknown; type: ChatRealtimeEventType } | null => {
  let parsed: RealtimeEnvelope;

  try {
    parsed = JSON.parse(data) as RealtimeEnvelope;
  } catch {
    return null;
  }

  if (!isChatRealtimeEventType(parsed.type)) {
    return null;
  }

  return {
    payload: parsed.payload,
    type: parsed.type,
  };
};
