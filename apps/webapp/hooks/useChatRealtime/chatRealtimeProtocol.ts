import { isRecord } from '@/lib/utils';

type RealtimeEnvelope = {
  type?: unknown;
  payload?: unknown;
};

export type ChatRealtimeEventType = 'chat.message' | 'chat.read' | 'chat.conversation.updated';

export interface ChatMessageRealtimePayload {
  messageId: string;
  senderUserId: string;
  recipientUserId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatReadRealtimePayload {
  readerUserId: string;
  withUserId: string;
  markedCount: number;
  readAt: string;
}

export interface ChatConversationUpdatedRealtimePayload {
  conversationWithUserId: string;
  unreadCount: number;
  unreadTotal: number;
  reason: 'chat.send' | 'chat.read';
  updatedAt: string;
  lastMessage: ChatMessageRealtimePayload | null;
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

  const lastMessage = value.lastMessage;

  return (
    typeof value.conversationWithUserId === 'string' &&
    typeof value.unreadCount === 'number' &&
    typeof value.unreadTotal === 'number' &&
    (value.reason === 'chat.send' || value.reason === 'chat.read') &&
    typeof value.updatedAt === 'string' &&
    (lastMessage === null || isChatMessagePayload(lastMessage))
  );
};

const isChatRealtimeEventType = (value: unknown): value is ChatRealtimeEventType => {
  return value === 'chat.message' || value === 'chat.read' || value === 'chat.conversation.updated';
};

export const parseChatRealtimeEvent = (data: string): { type: ChatRealtimeEventType; payload: unknown } | null => {
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
    type: parsed.type,
    payload: parsed.payload,
  };
};
