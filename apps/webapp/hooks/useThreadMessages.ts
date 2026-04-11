import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDayDividerLabel, isMessageGroupBreak, isSameCalendarDay } from '@/components/messages/chatUiUtils';

const MESSAGE_GROUP_WINDOW_MINUTES = 10;

export interface ThreadMessage {
  chatMessageId: string;
  senderUserId: string;
  recipientUserId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface PendingMessage {
  clientId: string;
  recipientUserId: string;
  message: string;
  createdAt: string;
}

export type ThreadRenderItem =
  | { kind: 'divider'; key: string; label: string }
  | {
      kind: 'message';
      key: string;
      fromMe: boolean;
      isGroupStart: boolean;
      isGroupEnd: boolean;
      pending?: boolean;
      message: ThreadMessage;
    };

interface UseThreadMessagesParams {
  messages: ThreadMessage[];
  currentUserId: string | null;
}

export function useThreadMessages({ messages, currentUserId }: UseThreadMessagesParams) {
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const pendingIdCounterRef = useRef(0);

  // Prune pending messages confirmed by the server
  useEffect(() => {
    if (pendingMessages.length === 0 || messages.length === 0) return;

    setPendingMessages((prev) => {
      const confirmed = prev.filter((pending) =>
        messages.some(
          (msg) =>
            msg.senderUserId === currentUserId &&
            msg.recipientUserId === pending.recipientUserId &&
            msg.message === pending.message &&
            Math.abs(new Date(msg.createdAt).getTime() - new Date(pending.createdAt).getTime()) < 30_000,
        ),
      );

      if (confirmed.length === 0) return prev;

      const confirmedIds = new Set(confirmed.map((m) => m.clientId));
      return prev.filter((m) => !confirmedIds.has(m.clientId));
    });
  }, [currentUserId, messages, pendingMessages.length]);

  const renderedMessages = useMemo(() => {
    const sorted = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const pendingAsMessages = pendingMessages.map((p) => ({
      chatMessageId: p.clientId,
      senderUserId: currentUserId || '',
      recipientUserId: p.recipientUserId,
      message: p.message,
      isRead: false,
      createdAt: p.createdAt,
      __pending: true as const,
    }));

    return [...sorted, ...pendingAsMessages];
  }, [currentUserId, messages, pendingMessages]);

  const threadItems = useMemo<ThreadRenderItem[]>(() => {
    if (renderedMessages.length === 0) return [];

    const items: ThreadRenderItem[] = [];

    renderedMessages.forEach((message, index) => {
      const previous = renderedMessages[index - 1];
      const next = renderedMessages[index + 1];

      if (!previous || !isSameCalendarDay(previous.createdAt, message.createdAt)) {
        items.push({
          kind: 'divider',
          key: `divider-${message.chatMessageId}`,
          label: formatDayDividerLabel(message.createdAt),
        });
      }

      const sameSenderAsPrev = previous ? previous.senderUserId === message.senderUserId : false;
      const sameSenderAsNext = next ? next.senderUserId === message.senderUserId : false;

      const startsGroup =
        !previous ||
        !sameSenderAsPrev ||
        !isSameCalendarDay(previous.createdAt, message.createdAt) ||
        isMessageGroupBreak({
          previousTimestamp: previous.createdAt,
          currentTimestamp: message.createdAt,
          windowMinutes: MESSAGE_GROUP_WINDOW_MINUTES,
        });

      const endsGroup =
        !next ||
        !sameSenderAsNext ||
        !isSameCalendarDay(next.createdAt, message.createdAt) ||
        isMessageGroupBreak({
          previousTimestamp: message.createdAt,
          currentTimestamp: next.createdAt,
          windowMinutes: MESSAGE_GROUP_WINDOW_MINUTES,
        });

      items.push({
        kind: 'message',
        key: message.chatMessageId,
        message,
        fromMe: message.senderUserId === currentUserId,
        isGroupStart: startsGroup,
        isGroupEnd: endsGroup,
        pending: '__pending' in message && message.__pending === true,
      });
    });

    return items;
  }, [currentUserId, renderedMessages]);

  const addPendingMessage = ({ recipientUserId, message }: { recipientUserId: string; message: string }) => {
    pendingIdCounterRef.current += 1;
    const pending: PendingMessage = {
      clientId: `pending-${Date.now()}-${pendingIdCounterRef.current}`,
      recipientUserId,
      message,
      createdAt: new Date().toISOString(),
    };
    setPendingMessages((prev) => [...prev, pending]);
  };

  return { addPendingMessage, threadItems };
}
