import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, ID, Int, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Notification, NotificationConnection, User, UserRole } from '@gatherle/commons/types';
import { NotificationDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { getAuthenticatedUser, CustomError, ErrorTypes } from '@/utils';
import { NOTIFICATION_DESCRIPTIONS } from '@gatherle/commons/constants';

@Resolver(() => Notification)
export class NotificationResolver {
  @FieldResolver(() => User, { nullable: true, description: 'The user who triggered this notification' })
  async actor(@Root() notification: Notification, @Ctx() context: ServerContext): Promise<User | null> {
    if (!notification.actorUserId) {
      return null;
    }
    return context.loaders.user.load(notification.actorUserId);
  }

  @FieldResolver(() => User, { nullable: true, description: 'The user who received this notification' })
  async recipient(@Root() notification: Notification, @Ctx() context: ServerContext): Promise<User | null> {
    return context.loaders.user.load(notification.recipientUserId);
  }

  // ============ Queries ============

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => NotificationConnection, { description: NOTIFICATION_DESCRIPTIONS.QUERIES.notifications })
  async notifications(
    @Ctx() context: ServerContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor?: string,
    @Arg('unreadOnly', () => Boolean, { nullable: true, defaultValue: false }) unreadOnly?: boolean,
  ): Promise<NotificationConnection> {
    const user = getAuthenticatedUser(context);
    return NotificationDAO.readByUserId(user.userId, { limit, cursor, unreadOnly });
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => Int, { description: NOTIFICATION_DESCRIPTIONS.QUERIES.unreadNotificationCount })
  async unreadNotificationCount(@Ctx() context: ServerContext): Promise<number> {
    const user = getAuthenticatedUser(context);
    return NotificationDAO.countUnread(user.userId);
  }

  // ============ Mutations ============

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Notification, { description: NOTIFICATION_DESCRIPTIONS.MUTATIONS.markNotificationRead })
  async markNotificationRead(
    @Arg('notificationId', () => ID) notificationId: string,
    @Ctx() context: ServerContext,
  ): Promise<Notification> {
    const user = getAuthenticatedUser(context);

    // markAsRead already validates ownership via the userId parameter
    const updated = await NotificationDAO.markAsRead(notificationId, user.userId);
    if (!updated) {
      throw CustomError('Notification not found or does not belong to you', ErrorTypes.NOT_FOUND);
    }
    return updated;
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Int, { description: NOTIFICATION_DESCRIPTIONS.MUTATIONS.markAllNotificationsRead })
  async markAllNotificationsRead(@Ctx() context: ServerContext): Promise<number> {
    const user = getAuthenticatedUser(context);
    return NotificationDAO.markAllAsRead(user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, { description: NOTIFICATION_DESCRIPTIONS.MUTATIONS.deleteNotification })
  async deleteNotification(
    @Arg('notificationId', () => ID) notificationId: string,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const user = getAuthenticatedUser(context);

    // delete already validates ownership via the userId parameter
    const deleted = await NotificationDAO.delete(notificationId, user.userId);
    if (!deleted) {
      throw CustomError('Notification not found or does not belong to you', ErrorTypes.NOT_FOUND);
    }
    return true;
  }
}
