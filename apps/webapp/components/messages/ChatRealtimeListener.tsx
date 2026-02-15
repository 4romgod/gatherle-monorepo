'use client';

import { useApolloClient } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef } from 'react';
import { GetUnreadChatCountDocument } from '@/data/graphql/query';
import { useChatRealtime } from '@/hooks/useChatRealtime';

const REFETCH_DEBOUNCE_MS = 250;

type PendingRefetchState = {
  shouldRefetchUnreadCount: boolean;
  shouldRefetchConversations: boolean;
  shouldRefetchMessages: boolean;
};

export default function ChatRealtimeListener() {
  const client = useApolloClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.userId;

  const pendingRefetchStateRef = useRef<PendingRefetchState>({
    shouldRefetchUnreadCount: false,
    shouldRefetchConversations: false,
    shouldRefetchMessages: false,
  });
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefetch = useCallback(
    ({
      unreadCount,
      conversations,
      messages,
    }: {
      unreadCount?: boolean;
      conversations?: boolean;
      messages?: boolean;
    }) => {
      if (unreadCount) {
        pendingRefetchStateRef.current.shouldRefetchUnreadCount = true;
      }

      if (conversations) {
        pendingRefetchStateRef.current.shouldRefetchConversations = true;
      }

      if (messages) {
        pendingRefetchStateRef.current.shouldRefetchMessages = true;
      }

      if (refetchTimeoutRef.current) {
        return;
      }

      refetchTimeoutRef.current = setTimeout(() => {
        const include: string[] = [];
        const pendingState = pendingRefetchStateRef.current;

        if (pendingState.shouldRefetchUnreadCount) {
          include.push('GetUnreadChatCount');
        }

        if (pendingState.shouldRefetchConversations) {
          include.push('ReadChatConversations');
        }

        if (pendingState.shouldRefetchMessages) {
          include.push('ReadChatMessages');
        }

        pendingRefetchStateRef.current = {
          shouldRefetchUnreadCount: false,
          shouldRefetchConversations: false,
          shouldRefetchMessages: false,
        };
        refetchTimeoutRef.current = null;

        if (include.length === 0) {
          return;
        }

        void client.refetchQueries({ include });
      }, REFETCH_DEBOUNCE_MS);
    },
    [client],
  );

  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
        refetchTimeoutRef.current = null;
      }
    };
  }, []);

  useChatRealtime({
    enabled: Boolean(currentUserId),
    onChatMessage: (payload) => {
      const unreadCountAffected = payload.recipientUserId === currentUserId;

      scheduleRefetch({
        unreadCount: unreadCountAffected,
        conversations: true,
        messages: true,
      });
    },
    onChatRead: () => {
      scheduleRefetch({
        unreadCount: true,
        conversations: true,
        messages: true,
      });
    },
    onChatConversationUpdated: (payload) => {
      client.writeQuery({
        query: GetUnreadChatCountDocument,
        data: {
          unreadChatCount: payload.unreadTotal,
        },
      });

      scheduleRefetch({
        conversations: true,
        messages: true,
      });
    },
  });

  return null;
}
