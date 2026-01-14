import 'reflect-metadata';
import {Arg, Authorized, Ctx, FieldResolver, ID, Mutation, Query, Resolver, Root} from 'type-graphql';
import {
  CreateFollowInput,
  Follow,
  FollowTargetType,
  User,
  UserRole,
  UpdateFollowNotificationPreferencesInput,
  FollowApprovalStatus,
  FollowPolicy,
  Organization,
} from '@ntlango/commons/types';
import {
  CreateFollowInputSchema,
  UpdateFollowNotificationPreferencesInputSchema,
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
  @Mutation(() => Follow, {description: RESOLVER_DESCRIPTIONS.FOLLOW.updateFollowNotificationPreferences})
  async updateFollowNotificationPreferences(
    @Arg('input', () => UpdateFollowNotificationPreferencesInput) input: UpdateFollowNotificationPreferencesInput,
    @Ctx() context: ServerContext,
  ): Promise<Follow> {
    validateInput(UpdateFollowNotificationPreferencesInputSchema, input);
    const user = getAuthenticatedUser(context);
    return FollowDAO.updateNotificationPreferences(input.followId, user.userId, input.notificationPreferences);
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
  ): Promise<Follow[]> {
    return FollowDAO.readFollowers(targetType, targetId);
  }
}
