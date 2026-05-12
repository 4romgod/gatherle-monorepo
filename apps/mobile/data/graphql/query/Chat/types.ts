import type { ReadChatConversationsQuery } from '../../types/graphql';

export type MobileChatConversation = ReadChatConversationsQuery['readChatConversations'][number];
