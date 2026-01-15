import 'reflect-metadata';
import {Arg, Authorized, Ctx, FieldResolver, ID, Mutation, Query, Resolver, Root} from 'type-graphql';
import {
  CreateFollowInput,
  Follow,
  FollowTargetType,
  User,
  UserRole,
  FollowApprovalStatus,
  FollowPolicy,
  Organization,
  SocialVisibility,
} from '@ntlango/commons/types';
import {
  CreateFollowInputSchema,
} from '@/validation/zod';
import {validateInput} from '@/validation';
import {FollowDAO, UserDAO, OrganizationDAO} from '@/mongodb/dao';
import type {ServerContext} from '@/graphql';
import {RESOLVER_DESCRIPTIONS} from '@/constants';
import {getAuthenticatedUser, CustomError, ErrorTypes} from '@/utils';

@Resolver(() => Follow)
export class FollowResolver {
  @FieldResolver(() => User, {nullable: true})
  async follower(@Root() follow: Follow, @Ctx() context: ServerContext): Promise<User | null> {
    const user = await context.loaders.user.load(follow.followerUserId);
    if (!user) {
      return null;
    }
    return user;
  }

  @FieldResolver(() => User, {nullable: true})
  async targetUser(@Root() follow: Follow, @Ctx() context: ServerContext): Promise<User | null> {
    if (follow.targetType !== FollowTargetType.User) {
      return null;
    }
    return context.loaders.user.load(follow.targetId);
  }

  @FieldResolver(() => Organization, {nullable: true})
  async targetOrganization(@Root() follow: Follow, @Ctx() context: ServerContext): Promise<Organization | null> {
    if (follow.targetType !== FollowTargetType.Organization) {
      return null;
    }
    return context.loaders.organization.load(follow.targetId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Follow, {description: RESOLVER_DESCRIPTIONS.FOLLOW.follow})
  async follow(@Arg('input', () => CreateFollowInput) input: CreateFollowInput, @Ctx() context: ServerContext): Promise<Follow> {
    validateInput(CreateFollowInputSchema, input);
    const user = getAuthenticatedUser(context);

    let approvalStatus = FollowApprovalStatus.Pending;

    if (input.targetType === FollowTargetType.User) {
      const targetUser = await UserDAO.readUserById(input.targetId);
      
      // Check if the target user has blocked the follower
      if (targetUser.blockedUserIds && targetUser.blockedUserIds.includes(user.userId)) {
        throw CustomError('You cannot follow this user', ErrorTypes.UNAUTHORIZED);
      }
      
      // Check if the follower has blocked the target user
      const followerUser = await UserDAO.readUserById(user.userId);
      if (followerUser.blockedUserIds && followerUser.blockedUserIds.includes(input.targetId)) {
        throw CustomError('You cannot follow a blocked user', ErrorTypes.UNAUTHORIZED);
      }
      
      approvalStatus = targetUser.followPolicy === FollowPolicy.Public
        ? FollowApprovalStatus.Accepted
        : FollowApprovalStatus.Pending;
    } else if (input.targetType === FollowTargetType.Organization) {
      const targetOrg = await OrganizationDAO.readOrganizationById(input.targetId);
      approvalStatus = targetOrg.followPolicy === FollowPolicy.Public
        ? FollowApprovalStatus.Accepted
        : FollowApprovalStatus.Pending;
    }

    return FollowDAO.upsert({...input, followerUserId: user.userId, approvalStatus});
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, {description: RESOLVER_DESCRIPTIONS.FOLLOW.unfollow})
  async unfollow(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Arg('targetId', () => ID) targetId: string,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.remove({followerUserId: user.userId, targetType, targetId});
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Follow, {description: RESOLVER_DESCRIPTIONS.FOLLOW.acceptFollowRequest})
  async acceptFollowRequest(@Arg('followId', () => ID) followId: string, @Ctx() context: ServerContext): Promise<Follow> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.updateApprovalStatus(followId, user.userId, FollowApprovalStatus.Accepted);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, {description: RESOLVER_DESCRIPTIONS.FOLLOW.rejectFollowRequest})
  async rejectFollowRequest(@Arg('followId', () => ID) followId: string, @Ctx() context: ServerContext): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    await FollowDAO.updateApprovalStatus(followId, user.userId, FollowApprovalStatus.Rejected);
    return true;
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, {description: 'Remove a follower from your account'})
  async removeFollower(
    @Arg('followerUserId', () => ID) followerUserId: string,
    @Arg('targetType', () => FollowTargetType, {defaultValue: FollowTargetType.User}) targetType: FollowTargetType,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.removeFollower(user.userId, followerUserId, targetType);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Follow], {description: RESOLVER_DESCRIPTIONS.FOLLOW.readFollowing})
  async readFollowing(@Ctx() context: ServerContext): Promise<Follow[]> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.readFollowingForUser(user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Follow], {description: RESOLVER_DESCRIPTIONS.FOLLOW.readPendingFollowRequests})
  async readPendingFollowRequests(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Ctx() context: ServerContext,
  ): Promise<Follow[]> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.readPendingFollows(user.userId, targetType);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Follow], {description: 'Get all follow requests for the authenticated user, including accepted and rejected'})
  async readFollowRequests(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Ctx() context: ServerContext,
  ): Promise<Follow[]> {
    const user = getAuthenticatedUser(context);
    return FollowDAO.readFollowRequests(user.userId, targetType);
  }

  @Query(() => [Follow], {description: RESOLVER_DESCRIPTIONS.FOLLOW.readFollowers})
  async readFollowers(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Arg('targetId', () => ID) targetId: string,
    @Ctx() context: ServerContext,
  ): Promise<Follow[]> {
    // Check visibility settings
    let visibility: SocialVisibility = SocialVisibility.Public;

    if (targetType === FollowTargetType.User) {
      const targetUser = await UserDAO.readUserById(targetId);
      visibility = targetUser.followersListVisibility ?? SocialVisibility.Public;

      // Check if viewer has permission
      const viewerId = context.user?.userId;
      if (visibility === SocialVisibility.Private && viewerId !== targetId) {
        return [];
      }

      if (visibility === SocialVisibility.Followers && viewerId && viewerId !== targetId) {
        // Check if viewer follows the target
        const viewerFollowsTarget = await FollowDAO.readFollowingForUser(viewerId);
        const isFollowing = viewerFollowsTarget.some(
          f => f.targetId === targetId && 
               f.targetType === FollowTargetType.User && 
               f.approvalStatus === FollowApprovalStatus.Accepted
        );
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
        const viewerFollowsTarget = await FollowDAO.readFollowingForUser(viewerId);
        const isFollowing = viewerFollowsTarget.some(
          f => f.targetId === targetId && 
               f.targetType === FollowTargetType.Organization && 
               f.approvalStatus === FollowApprovalStatus.Accepted
        );
        if (!isFollowing) {
          return [];
        }
      }
    }
    
    return FollowDAO.readFollowers(targetType, targetId);
  }
}
