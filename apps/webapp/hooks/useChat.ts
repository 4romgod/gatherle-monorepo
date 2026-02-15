'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import {
  GetUnreadChatCountDocument,
  MarkChatConversationReadDocument,
  ReadChatConversationsDocument,
  ReadChatMessagesDocument,
} from '@/data/graphql/query';
import { getAuthHeader } from '@/lib/utils';

interface UseChatConversationsOptions {
  limit?: number;
}

interface UseChatMessagesOptions {
  withUserId?: string | null;
  limit?: number;
  markAsRead?: boolean;
}

export function useChatConversations(options: UseChatConversationsOptions = {}) {
  const { limit = 50 } = options;
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(ReadChatConversationsDocument, {
    variables: { limit },
    skip: !token,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    conversations: data?.readChatConversations ?? [],
    loading,
    error,
    refetch,
  };
}

export function useChatMessages(options: UseChatMessagesOptions = {}) {
  const { withUserId, limit = 50, markAsRead = true } = options;
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch, fetchMore } = useQuery(ReadChatMessagesDocument, {
    variables: {
      withUserId: withUserId || '',
      limit,
      markAsRead,
    },
    skip: !token || !withUserId,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  const loadMore = useCallback(async () => {
    if (!data?.readChatMessages?.nextCursor || !data.readChatMessages.hasMore || !withUserId) {
      return;
    }

    await fetchMore({
      variables: {
        withUserId,
        cursor: data.readChatMessages.nextCursor,
        limit,
        markAsRead: false,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult?.readChatMessages) {
          return prev;
        }

        return {
          readChatMessages: {
            ...fetchMoreResult.readChatMessages,
            messages: [...prev.readChatMessages.messages, ...fetchMoreResult.readChatMessages.messages],
          },
        };
      },
    });
  }, [data?.readChatMessages, fetchMore, limit, withUserId]);

  return {
    messages: data?.readChatMessages?.messages ?? [],
    hasMore: data?.readChatMessages?.hasMore ?? false,
    nextCursor: data?.readChatMessages?.nextCursor,
    count: data?.readChatMessages?.count ?? 0,
    loading,
    error,
    refetch,
    loadMore,
  };
}

export function useUnreadChatCount(pollInterval?: number) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const [isVisible, setIsVisible] = useState(() => typeof document !== 'undefined' && !document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const { data, loading, error, refetch } = useQuery(GetUnreadChatCountDocument, {
    skip: !token || !isVisible,
    fetchPolicy: 'cache-and-network',
    pollInterval: pollInterval && isVisible ? pollInterval : 0,
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    unreadCount: data?.unreadChatCount ?? 0,
    loading,
    error,
    refetch,
  };
}

export function useChatActions() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [markConversationReadMutation, { loading: markConversationReadLoading }] = useMutation(
    MarkChatConversationReadDocument,
  );

  const markConversationRead = useCallback(
    async (withUserId: string) => {
      return markConversationReadMutation({
        variables: { withUserId },
        context: {
          headers: getAuthHeader(token),
        },
        refetchQueries: ['ReadChatConversations', 'ReadChatMessages', 'GetUnreadChatCount'],
        awaitRefetchQueries: true,
      });
    },
    [markConversationReadMutation, token],
  );

  return {
    markConversationRead,
    markConversationReadLoading,
  };
}
