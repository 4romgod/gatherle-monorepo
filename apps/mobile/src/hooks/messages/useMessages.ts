import { useMutation, useQuery } from '@apollo/client';
import { MarkChatConversationReadDocument } from '@data/graphql/mutation/Chat/mutation';
import { ReadChatConversationsDocument } from '@data/graphql/query/Chat/query';
import { getApolloAuthContext } from '@/lib/auth';

export function useMessages(authToken: string | null, enabled = true) {
  const { data, error, loading, refetch } = useQuery(ReadChatConversationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !enabled || !authToken,
    variables: {
      limit: 24,
    },
    ...getApolloAuthContext(authToken),
  });

  const [markConversationReadMutation] = useMutation(MarkChatConversationReadDocument, getApolloAuthContext(authToken));

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

  return {
    conversations: data?.readChatConversations ?? [],
    error,
    loading,
    markConversationRead,
    refetch,
  };
}
