import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, ID, Int, Mutation, Query, Resolver, Root } from 'type-graphql';
import { ChatConversation, ChatMessage, ChatMessageConnection, User, UserRole } from '@gatherle/commons/types';
import { ChatMessageDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { getAuthenticatedUser } from '@/utils';

@Resolver(() => ChatMessage)
export class ChatResolver {
  @FieldResolver(() => User, { nullable: true, description: 'Resolved sender user for this message.' })
  async sender(@Root() chatMessage: ChatMessage, @Ctx() context: ServerContext): Promise<User | null> {
    return context.loaders.user.load(chatMessage.senderUserId);
  }

  @FieldResolver(() => User, { nullable: true, description: 'Resolved recipient user for this message.' })
  async recipient(@Root() chatMessage: ChatMessage, @Ctx() context: ServerContext): Promise<User | null> {
    return context.loaders.user.load(chatMessage.recipientUserId);
  }

  @FieldResolver(() => User, { nullable: true, description: 'Resolved user for the other conversation participant.' })
  async conversationWithUser(
    @Root() conversation: ChatConversation,
    @Ctx() context: ServerContext,
  ): Promise<User | null> {
    return context.loaders.user.load(conversation.conversationWithUserId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => ChatMessageConnection, { description: 'Read direct chat messages with another user.' })
  async readChatMessages(
    @Arg('withUserId', () => ID) withUserId: string,
    @Ctx() context: ServerContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor?: string,
    @Arg('markAsRead', () => Boolean, { nullable: true, defaultValue: true }) markAsRead?: boolean,
  ): Promise<ChatMessageConnection> {
    const user = getAuthenticatedUser(context);
    if (markAsRead) {
      await ChatMessageDAO.markConversationRead(user.userId, withUserId);
    }
    return ChatMessageDAO.readConversation(user.userId, withUserId, { limit, cursor });
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [ChatConversation], { description: 'Read recent chat conversations for the authenticated user.' })
  async readChatConversations(
    @Ctx() context: ServerContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
  ): Promise<ChatConversation[]> {
    const user = getAuthenticatedUser(context);
    return ChatMessageDAO.readConversations(user.userId, limit);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => Int, { description: 'Read total unread chat message count for the authenticated user.' })
  async unreadChatCount(@Ctx() context: ServerContext): Promise<number> {
    const user = getAuthenticatedUser(context);
    return ChatMessageDAO.countUnreadTotal(user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Int, { description: 'Mark all unread messages from a specific user as read.' })
  async markChatConversationRead(
    @Arg('withUserId', () => ID) withUserId: string,
    @Ctx() context: ServerContext,
  ): Promise<number> {
    const user = getAuthenticatedUser(context);
    return ChatMessageDAO.markConversationRead(user.userId, withUserId);
  }
}
