import { graphql } from '../../types';

export const GetChatConversationsDocument = graphql(`
  query GetChatConversations($limit: Int) {
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

export const GetUnreadChatCountDocument = graphql(`
  query GetUnreadChatCount {
    unreadChatCount
  }
`);

export const GetChatMessagesDocument = graphql(`
  query GetChatMessages($withUserId: ID!, $limit: Int, $cursor: String, $markAsRead: Boolean) {
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
