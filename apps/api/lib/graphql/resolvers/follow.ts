import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, ID, Mutation, Query, Resolver, Root } from 'type-graphql';
import {
  CreateFollowInput,
  Follow,
  FollowTargetType,
  User,
  UserRole,
  Organization,
  SocialVisibility,
  Event,
} from '@gatherle/commons/types';
import { CreateFollowInputSchema } from '@/validation/zod';
import { validateInput } from '@/validation';
import { FollowDAO, UserDAO, OrganizationDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import { getAuthenticatedUser } from '@/utils';
import { FollowService } from '@/services';

@Resolver(() => Follow)
export class FollowResolver {
  @FieldResolver(() => User, { nullable: true })
  async follower(@Root() follow: Follow, @Ctx() context: ServerContext): Promise<User | null> {
    const user = await context.loaders.user.load(follow.followerUserId);
    if (!user) {
      return null;
    }
    return user;
  }

  @FieldResolver(() => User, { nullable: true })
  async targetUser(@Root() follow: Follow, @Ctx() context: ServerContext): Promise<User | null> {
    if (follow.targetType !== FollowTargetType.User) {
      return null;
    }
    return context.loaders.user.load(follow.targetId);
  }

  @FieldResolver(() => Organization, { nullable: true })
  async targetOrganization(@Root() follow: Follow, @Ctx() context: ServerContext): Promise<Organization | null> {
    if (follow.targetType !== FollowTargetType.Organization) {
      return null;
    }
    return context.loaders.organization.load(follow.targetId);
  }

  @FieldResolver(() => Event, { nullable: true })
  async targetEvent(@Root() follow: Follow, @Ctx() context: ServerContext): Promise<Event | null> {
    if (follow.targetType !== FollowTargetType.Event) {
      return null;
    }
    return context.loaders.event.load(follow.targetId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Follow, { description: RESOLVER_DESCRIPTIONS.FOLLOW.follow })
  async follow(
    @Arg('input', () => CreateFollowInput) input: CreateFollowInput,
    @Ctx() context: ServerContext,
  ): Promise<Follow> {
    validateInput(CreateFollowInputSchema, input);
    const user = getAuthenticatedUser(context);

    return FollowService.follow({ ...input, followerUserId: user.userId });
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, { description: RESOLVER_DESCRIPTIONS.FOLLOW.unfollow })
  async unfollow(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Arg('targetId', () => ID) targetId: string,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    return FollowService.unfollow({ followerUserId: user.userId, targetType, targetId });
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Follow, { description: RESOLVER_DESCRIPTIONS.FOLLOW.acceptFollowRequest })
  async acceptFollowRequest(
    @Arg('followId', () => ID) followId: string,
    @Ctx() context: ServerContext,
  ): Promise<Follow> {
    const user = getAuthenticatedUser(context);
    return FollowService.acceptFollowRequest(followId, user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, { description: RESOLVER_DESCRIPTIONS.FOLLOW.rejectFollowRequest })
  async rejectFollowRequest(
    @Arg('followId', () => ID) followId: string,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    return FollowService.rejectFollowRequest(followId, user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, { description: RESOLVER_DESCRIPTIONS.FOLLOW.removeFollower })
  async removeFollower(
    @Arg('followerUserId', () => ID) followerUserId: string,
    @Arg('targetType', () => FollowTargetType, { defaultValue: FollowTargetType.User }) targetType: FollowTargetType,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    return FollowService.removeFollower(user.userId, followerUserId, targetType);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Follow], { description: RESOLVER_DESCRIPTIONS.FOLLOW.readFollowing })
  async readFollowing(@Ctx() context: ServerContext): Promise<Follow[]> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.readFollowingForUser(user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Follow], { description: RESOLVER_DESCRIPTIONS.FOLLOW.readPendingFollowRequests })
  async readPendingFollowRequests(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Ctx() context: ServerContext,
  ): Promise<Follow[]> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.readPendingFollows(user.userId, targetType);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Follow], {
    description: 'Get all follow requests for the authenticated user, including accepted and rejected',
  })
  async readFollowRequests(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Ctx() context: ServerContext,
  ): Promise<Follow[]> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.readFollowRequests(user.userId, targetType);
  }

  @Query(() => [Follow], { description: RESOLVER_DESCRIPTIONS.FOLLOW.readFollowers })
  async readFollowers(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Arg('targetId', () => ID) targetId: string,
    @Ctx() context: ServerContext,
  ): Promise<Follow[]> {
    // Check visibility settings
    let visibility: SocialVisibility;

    if (targetType === FollowTargetType.User) {
      const targetUser = await UserDAO.readUserById(targetId);
      visibility = targetUser.followersListVisibility ?? SocialVisibility.Public;

      // Check if viewer has permission
      const viewerId = context.user?.userId;
      if (visibility === SocialVisibility.Private && viewerId !== targetId) {
        return [];
      }

      if (visibility === SocialVisibility.Followers && viewerId && viewerId !== targetId) {
        // Check if viewer follows the target (single query instead of loading all follows)
        const isFollowing = await FollowDAO.isFollowing(viewerId, FollowTargetType.User, targetId);
        if (!isFollowing) {
          return [];
        }
      }
    } else if (targetType === FollowTargetType.Organization) {
      const targetOrg = await OrganizationDAO.readOrganizationById(targetId);
      visibility = targetOrg.followersListVisibility ?? SocialVisibility.Public;

      const viewerId = context.user?.userId;
      if (visibility === SocialVisibility.Private && viewerId !== targetOrg.ownerId) {
        return [];
      }

      if (visibility === SocialVisibility.Followers && viewerId && viewerId !== targetOrg.ownerId) {
        // Check if viewer follows the target (single query instead of loading all follows)
        const isFollowing = await FollowDAO.isFollowing(viewerId, FollowTargetType.Organization, targetId);
        if (!isFollowing) {
          return [];
        }
      }
    }

    return FollowDAO.readFollowers(targetType, targetId);
  }

  // ============================================================================
  // SAVED EVENTS QUERIES
  // ============================================================================

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Follow], { description: 'Get all saved events for the authenticated user' })
  async readSavedEvents(@Ctx() context: ServerContext): Promise<Follow[]> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.readSavedEventsForUser(user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => Boolean, { description: 'Check if the authenticated user has saved a specific event' })
  async isEventSaved(@Arg('eventId', () => ID) eventId: string, @Ctx() context: ServerContext): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.isEventSavedByUser(eventId, user.userId);
  }
}
