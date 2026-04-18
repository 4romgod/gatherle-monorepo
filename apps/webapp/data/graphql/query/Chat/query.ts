import { graphql } from '@/data/graphql/types';

export const ReadChatConversationsDocument = graphql(`
  query ReadChatConversations($limit: Int) {
    readChatConversations(limit: $limit) {
      conversationWithUserId
      conversationWithUser {
        userId
        username
        given_name
        family_name
        profile_picture
      }
      unreadCount
      updatedAt
      lastMessage {
        chatMessageId
        senderUserId
        recipientUserId
        message
        isRead
        readAt
        createdAt
      }
    }
  }
`);

export const ReadChatMessagesDocument = graphql(`
  query ReadChatMessages($withUserId: ID!, $limit: Int, $cursor: String, $markAsRead: Boolean) {
    readChatMessages(withUserId: $withUserId, limit: $limit, cursor: $cursor, markAsRead: $markAsRead) {
      messages {
        chatMessageId
        senderUserId
        recipientUserId
        message
        isRead
        readAt
        createdAt
        replyToMomentId
        replyToMomentCaption
        replyToMomentType
      }
      nextCursor
      hasMore
      count
    }
  }
`);

export const GetUnreadChatCountDocument = graphql(`
  query GetUnreadChatCount {
    unreadChatCount
  }
`);

export const MarkChatConversationReadDocument = graphql(`
  mutation MarkChatConversationRead($withUserId: ID!) {
    markChatConversationRead(withUserId: $withUserId)
  }
`);
