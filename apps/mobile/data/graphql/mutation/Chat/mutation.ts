import { graphql } from '../../types';

export const MarkChatConversationReadDocument = graphql(`
  mutation MarkChatConversationRead($withUserId: ID!) {
    markChatConversationRead(withUserId: $withUserId)
  }
`);
