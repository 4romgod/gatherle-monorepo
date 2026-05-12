import { graphql } from '../../types';

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

export const GetUnreadChatCountDocument = graphql(`
  query GetUnreadChatCount {
    unreadChatCount
  }
`);
