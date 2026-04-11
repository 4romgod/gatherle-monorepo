'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { GetUserByUsernameDocument } from '@/data/graphql/types/graphql';
import { useChatConversations, useChatMessages, useResolveConversationUsers } from '@/hooks';
import { resolveChatIdentity } from '@/components/messages/chatUiUtils';

const CHAT_MESSAGES_LIMIT = 100;
const CHAT_CONVERSATIONS_LIMIT = 100;

export function useConversationData(username: string) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.userId || null;

  const {
    data: targetUserData,
    loading: targetUserLoading,
    error: targetUserError,
  } = useQuery(GetUserByUsernameDocument, {
    variables: { username },
    fetchPolicy: 'cache-and-network',
  });

  const targetUser = targetUserData?.readUserByUsername;
  const targetUserId = targetUser?.userId;

  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
  } = useChatConversations({
    limit: CHAT_CONVERSATIONS_LIMIT,
  });

  const resolvedUsersByConversationId = useResolveConversationUsers(conversations);

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
  } = useChatMessages({
    withUserId: targetUserId,
    limit: CHAT_MESSAGES_LIMIT,
    markAsRead: true,
  });

  const displayIdentity = useMemo(
    () =>
      resolveChatIdentity({
        givenName: targetUser?.given_name,
        familyName: targetUser?.family_name,
        username: targetUser?.username || username,
      }),
    [targetUser?.family_name, targetUser?.given_name, targetUser?.username, username],
  );

  return {
    currentUserId,
    targetUser,
    targetUserId,
    targetUserLoading,
    targetUserError,
    conversations,
    conversationsLoading,
    conversationsError,
    resolvedUsersByConversationId,
    messages,
    messagesLoading,
    messagesError,
    displayIdentity,
  };
}
