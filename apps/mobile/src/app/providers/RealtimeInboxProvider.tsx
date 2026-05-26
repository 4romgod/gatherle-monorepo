import { useApolloClient } from '@apollo/client';
import { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import {
  GetChatConversationsDocument,
  GetChatMessagesDocument,
  GetUnreadChatCountDocument,
} from '@data/graphql/query/Chat/query';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useChatRealtime } from '@/hooks/messages/useChatRealtime';
import { useNotificationRealtime } from '@/hooks/notifications/useNotificationRealtime';

const REFETCH_DEBOUNCE_MS = 250;

type PendingChatRefetchState = {
  shouldRefetchConversations: boolean;
  shouldRefetchMessages: boolean;
};

export function RealtimeInboxProvider({ children }: PropsWithChildren) {
  const client = useApolloClient();
  const { isAuthenticated, userId } = useAppShell();
  const pendingRefetchStateRef = useRef<PendingChatRefetchState>({
    shouldRefetchConversations: false,
    shouldRefetchMessages: false,
  });
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleChatRefetch = useCallback(
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
        const include: Array<typeof GetChatConversationsDocument | typeof GetChatMessagesDocument> = [];
        const pendingState = pendingRefetchStateRef.current;

        if (pendingState.shouldRefetchConversations) {
          include.push(GetChatConversationsDocument);
        }

        if (pendingState.shouldRefetchMessages) {
          include.push(GetChatMessagesDocument);
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
    enabled: isAuthenticated && Boolean(userId),
    onChatMessage: () => {
      scheduleChatRefetch({
        conversations: true,
        messages: true,
      });
    },
    onChatRead: () => {
      scheduleChatRefetch({
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

      scheduleChatRefetch({
        conversations: true,
        messages: true,
      });
    },
  });

  useNotificationRealtime(isAuthenticated && Boolean(userId));

  return children;
}
