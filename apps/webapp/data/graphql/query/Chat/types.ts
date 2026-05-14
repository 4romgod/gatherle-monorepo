import type { GetChatConversationsQuery, GetChatMessagesQuery } from '@/data/graphql/types/graphql';

export type ChatConversation = GetChatConversationsQuery['readChatConversations'][number];
export type ChatMessageConnection = GetChatMessagesQuery['readChatMessages'];
export type ChatMessage = ChatMessageConnection['messages'][number];
