import type { GetChatConversationsQuery, GetChatMessagesQuery } from '../../types/graphql';

export type MobileChatConversation = GetChatConversationsQuery['readChatConversations'][number];
export type MobileChatMessage = GetChatMessagesQuery['readChatMessages']['messages'][number];
