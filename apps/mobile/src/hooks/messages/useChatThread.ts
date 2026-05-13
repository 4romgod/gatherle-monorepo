import { useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { ReadChatMessagesDocument } from '@data/graphql/query/Chat/query';
import type { MobileChatMessage } from '@data/graphql/query/Chat/types';
import { getApolloAuthContext } from '@/lib/auth';

type UseChatThreadOptions = {
  authToken: string | null;
  enabled?: boolean;
  withUserId: string | null;
};

export function useChatThread({ authToken, enabled = true, withUserId }: UseChatThreadOptions) {
  const { data, error, fetchMore, loading, refetch } = useQuery(ReadChatMessagesDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !enabled || !authToken || !withUserId,
    variables: {
      limit: 40,
      markAsRead: true,
      withUserId: withUserId ?? '',
    },
    ...getApolloAuthContext(authToken),
  });

  const thread = data?.readChatMessages;
  const [messages, setMessages] = useState<MobileChatMessage[]>([]);

  useEffect(() => {
    setMessages([]);
  }, [withUserId]);

  useEffect(() => {
    if (!thread?.messages) {
      return;
    }

    setMessages((currentMessages) => mergeMessages(currentMessages, thread.messages));
  }, [thread?.messages]);

  const loadMore = async () => {
    if (!thread?.hasMore || !thread.nextCursor || !withUserId) {
      return;
    }

    await fetchMore({
      variables: {
        cursor: thread.nextCursor,
        limit: 40,
        markAsRead: false,
        withUserId,
      },
      updateQuery: (previousResult, { fetchMoreResult }) => {
        if (!fetchMoreResult?.readChatMessages) {
          return previousResult;
        }

        return {
          readChatMessages: {
            ...fetchMoreResult.readChatMessages,
            messages: [...previousResult.readChatMessages.messages, ...fetchMoreResult.readChatMessages.messages],
          },
        };
      },
    });
  };

  return {
    appendMessage: (message: MobileChatMessage) => {
      setMessages((currentMessages) => mergeMessages(currentMessages, [message]));
    },
    count: thread?.count ?? 0,
    error,
    hasMore: thread?.hasMore ?? false,
    loadMore,
    loading,
    messages,
    refetch,
  };
}

function mergeMessages(...messageGroups: MobileChatMessage[][]): MobileChatMessage[] {
  const mergedMessagesById = new Map<string, MobileChatMessage>();

  messageGroups.flat().forEach((message) => {
    mergedMessagesById.set(message.chatMessageId, message);
  });

  return [...mergedMessagesById.values()].sort((leftMessage, rightMessage) => {
    return new Date(leftMessage.createdAt).getTime() - new Date(rightMessage.createdAt).getTime();
  });
}
