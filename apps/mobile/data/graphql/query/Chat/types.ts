import type { ReadChatConversationsQuery, ReadChatMessagesQuery } from '../../types/graphql';

export type MobileChatConversation = ReadChatConversationsQuery['readChatConversations'][number];
export type MobileChatMessage = ReadChatMessagesQuery['readChatMessages']['messages'][number];
