import type { MobileChatMessage } from '@data/graphql/query/Chat/types';

export type ChatThreadItem =
  | {
      kind: 'day';
      key: string;
      label: string;
    }
  | {
      isOutgoing: boolean;
      key: string;
      kind: 'message';
      message: MobileChatMessage;
    };

function formatDayLabel(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) {
    return 'Today';
  }

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

export function formatThreadTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function buildChatThreadItems(messages: MobileChatMessage[], withUserId: string): ChatThreadItem[] {
  const items: ChatThreadItem[] = [];
  let lastDayKey: string | null = null;

  messages.forEach((message) => {
    const dayKey = message.createdAt.slice(0, 10);
    if (dayKey !== lastDayKey) {
      items.push({
        key: `day-${dayKey}`,
        kind: 'day',
        label: formatDayLabel(message.createdAt),
      });
      lastDayKey = dayKey;
    }

    items.push({
      isOutgoing: message.recipientUserId === withUserId,
      key: message.chatMessageId,
      kind: 'message',
      message,
    });
  });

  return items;
}
