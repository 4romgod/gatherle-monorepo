import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
import { MarkChatConversationReadDocument } from '@data/graphql/mutation/Chat/mutation';
import { ReadChatConversationsDocument } from '@data/graphql/query/Chat/query';
import type { MobileChatConversation } from '@data/graphql/query/Chat/types';
import { GetUserByIdDocument, type GetUserByIdQuery } from '@data/graphql/types/graphql';
import { getApolloAuthContext } from '@/lib/auth';

export function useMessages(authToken: string | null, enabled = true) {
  const apolloClient = useApolloClient();
  const { data, error, loading, refetch } = useQuery(ReadChatConversationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !enabled || !authToken,
    variables: {
      limit: 24,
    },
    ...getApolloAuthContext(authToken),
  });
  const [resolvedUsersByConversationId, setResolvedUsersByConversationId] = useState<
    Record<string, GetUserByIdQuery['readUserById']>
  >({});

  const [markConversationReadMutation] = useMutation(MarkChatConversationReadDocument, getApolloAuthContext(authToken));

  const conversations = data?.readChatConversations ?? [];

  useEffect(() => {
    if (!authToken || conversations.length === 0) {
      return;
    }

    const unresolvedConversationIds = conversations
      .filter(
        (conversation) =>
          !conversation.conversationWithUser?.username && !conversation.conversationWithUser?.profile_picture,
      )
      .map((conversation) => conversation.conversationWithUserId)
      .filter((conversationWithUserId) => !resolvedUsersByConversationId[conversationWithUserId]);

    if (unresolvedConversationIds.length === 0) {
      return;
    }

    let cancelled = false;

    const resolveMissingUsers = async () => {
      const resolvedEntries = await Promise.all(
        unresolvedConversationIds.map(async (userId) => {
          try {
            const { data: userData } = await apolloClient.query({
              fetchPolicy: 'cache-first',
              query: GetUserByIdDocument,
              variables: { userId },
              ...getApolloAuthContext(authToken),
            });

            return [userId, userData?.readUserById ?? null] as const;
          } catch {
            return [userId, null] as const;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setResolvedUsersByConversationId((previousState) => {
        const nextState = { ...previousState };

        resolvedEntries.forEach(([conversationWithUserId, user]) => {
          if (!user) {
            return;
          }

          nextState[conversationWithUserId] = user;
        });

        return nextState;
      });
    };

    void resolveMissingUsers();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, authToken, conversations, resolvedUsersByConversationId]);

  const markConversationRead = async (withUserId: string) => {
    if (!authToken) {
      return;
    }

    await markConversationReadMutation({
      variables: {
        withUserId,
      },
    });

    await refetch();
  };

  const hydratedConversations = useMemo(
    (): MobileChatConversation[] =>
      conversations.map((conversation) => {
        const resolvedUser = resolvedUsersByConversationId[conversation.conversationWithUserId];

        if (!resolvedUser) {
          return conversation;
        }

        return {
          ...conversation,
          conversationWithUser: {
            __typename: 'User',
            userId:
              conversation.conversationWithUser?.userId ?? resolvedUser.userId ?? conversation.conversationWithUserId,
            username: conversation.conversationWithUser?.username || resolvedUser.username,
            given_name: conversation.conversationWithUser?.given_name || resolvedUser.given_name,
            family_name: conversation.conversationWithUser?.family_name || resolvedUser.family_name,
            profile_picture: conversation.conversationWithUser?.profile_picture ?? resolvedUser.profile_picture ?? null,
          },
        };
      }),
    [conversations, resolvedUsersByConversationId],
  );

  return {
    conversations: hydratedConversations,
    error,
    loading,
    markConversationRead,
    refetch,
  };
}
