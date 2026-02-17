'use client';

import { useApolloClient } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef } from 'react';
import { GetUnreadChatCountDocument } from '@/data/graphql/query';
import { useChatRealtime } from './useChatRealtime';

const REFETCH_DEBOUNCE_MS = 250;

type PendingRefetchState = {
  shouldRefetchConversations: boolean;
  shouldRefetchMessages: boolean;
};

export function useChatRealtimeListener(enabled: boolean = true) {
  const client = useApolloClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.userId;

  const pendingRefetchStateRef = useRef<PendingRefetchState>({
    shouldRefetchConversations: false,
    shouldRefetchMessages: false,
  });
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefetch = useCallback(
    ({ conversations, messages }: { conversations?: boolean; messages?: boolean }) => {
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

        if (pendingState.shouldRefetchConversations) {
          include.push('ReadChatConversations');
        }

        if (pendingState.shouldRefetchMessages) {
          include.push('ReadChatMessages');
        }

        pendingRefetchStateRef.current = {
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
    enabled: enabled && Boolean(currentUserId),
    onChatMessage: () => {
      scheduleRefetch({
        conversations: true,
        messages: true,
      });
    },
    onChatRead: () => {
      scheduleRefetch({
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
}
