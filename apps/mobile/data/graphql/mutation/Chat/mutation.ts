import { graphql } from '../../types';

export const MarkChatConversationReadDocument = graphql(`
  mutation MarkChatConversationRead($withUserId: ID!) {
    markChatConversationRead(withUserId: $withUserId)
  }
`);

export const MarkChatConversationUnreadDocument = graphql(`
  mutation MarkChatConversationUnread($withUserId: ID!) {
    markChatConversationUnread(withUserId: $withUserId)
  }
`);
