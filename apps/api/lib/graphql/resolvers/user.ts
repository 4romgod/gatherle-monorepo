import 'reflect-metadata';
import { Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root, Ctx, ID } from 'type-graphql';
import { FollowDAO, UserDAO } from '@/mongodb/dao';
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  LoginUserInput,
  UserRole,
  UserWithToken,
  QueryOptionsInput,
  EventCategory,
  FollowTargetType,
  SessionState,
  SessionStateInput,
} from '@gatherle/commons/types';
import { CreateUserInputSchema, LoginUserInputSchema, UpdateUserInputSchema } from '@/validation/zod';
import { ERROR_MESSAGES, validateEmail, validateInput, validateMongodbId, validateUsername } from '@/validation';
import { RESOLVER_DESCRIPTIONS, USER_DESCRIPTIONS } from '@/constants';
import { getAuthenticatedUser } from '@/utils';
import type { ServerContext } from '@/graphql';
import { UserService } from '@/services';

@Resolver(() => User)
export class UserResolver {
  @FieldResolver(() => Number)
  async followersCount(@Root() user: User): Promise<number> {
    if (!user.userId) {
      return 0;
    }
    return FollowDAO.countFollowers(FollowTargetType.User, user.userId);
  }

  @Mutation(() => UserWithToken, { description: RESOLVER_DESCRIPTIONS.USER.createUser })
  async createUser(
    @Arg('input', () => CreateUserInput, { description: USER_DESCRIPTIONS.CREATE_INPUT }) input: CreateUserInput,
  ): Promise<UserWithToken> {
    validateInput<CreateUserInput>(CreateUserInputSchema, input);
    return UserDAO.create(input);
  }

  // TODO https://hygraph.com/learn/graphql/authentication-and-authorization
  @Mutation(() => UserWithToken, { description: RESOLVER_DESCRIPTIONS.USER.loginUser })
  async loginUser(@Arg('input', () => LoginUserInput) input: LoginUserInput): Promise<UserWithToken> {
    validateInput<LoginUserInput>(LoginUserInputSchema, input);
    return UserDAO.login(input);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.updateUser })
  async updateUser(@Arg('input', () => UpdateUserInput) input: UpdateUserInput): Promise<User> {
    validateInput<UpdateUserInput>(UpdateUserInputSchema, input);
    return UserDAO.updateUser(input);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.deleteUserById })
  async deleteUserById(@Arg('userId', () => String) userId: string): Promise<User> {
    validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
    return UserDAO.deleteUserById(userId);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.deleteUserByEmail })
  async deleteUserByEmail(@Arg('email', () => String) email: string): Promise<User> {
    validateEmail(email);
    return UserDAO.deleteUserByEmail(email);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.deleteUserByUsername })
  async deleteUserByUsername(@Arg('username', () => String) username: string): Promise<User> {
    validateUsername(username);
    return UserDAO.deleteUserByUsername(username);
  }

  @Query(() => User, { description: RESOLVER_DESCRIPTIONS.USER.readUserById })
  async readUserById(@Arg('userId', () => String) userId: string): Promise<User | null> {
    validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
    return UserDAO.readUserById(userId);
  }

  @Query(() => User, { description: RESOLVER_DESCRIPTIONS.USER.readUserByUsername })
  async readUserByUsername(@Arg('username', () => String) username: string): Promise<User | null> {
    return UserDAO.readUserByUsername(username);
  }

  @Query(() => User, { description: RESOLVER_DESCRIPTIONS.USER.readUserByEmail })
  async readUserByEmail(@Arg('email', () => String) email: string): Promise<User | null> {
    return UserDAO.readUserByEmail(email);
  }

  @Query(() => [User], { description: RESOLVER_DESCRIPTIONS.USER.readUsers })
  async readUsers(
    @Arg('options', () => QueryOptionsInput, { nullable: true }) options?: QueryOptionsInput,
  ): Promise<User[]> {
    return UserDAO.readUsers(options);
  }

  @FieldResolver(() => [EventCategory], { nullable: true })
  async interests(@Root() user: User, @Ctx() context: ServerContext): Promise<EventCategory[]> {
    if (!user.interests || user.interests.length === 0) {
      return [];
    }

    // Check if already populated
    const first = user.interests[0];
    if (typeof first === 'object' && first !== null && 'eventCategoryId' in first) {
      return user.interests as EventCategory[];
    }

    // Batch-load via DataLoader
    const categoryIds = user.interests.map((ref) =>
      typeof ref === 'string' ? ref : (ref as any)._id?.toString() || ref.toString(),
    );
    const categories = await Promise.all(categoryIds.map((id) => context.loaders.eventCategory.load(id)));
    return categories.filter((c): c is EventCategory => c !== null);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Block a user' })
  async blockUser(@Arg('blockedUserId', () => ID) blockedUserId: string, @Ctx() context: ServerContext): Promise<User> {
    const user = getAuthenticatedUser(context);
    validateMongodbId(blockedUserId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', blockedUserId));
    return UserService.blockUser(user.userId, blockedUserId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Unblock a user' })
  async unblockUser(
    @Arg('blockedUserId', () => ID) blockedUserId: string,
    @Ctx() context: ServerContext,
  ): Promise<User> {
    const user = getAuthenticatedUser(context);
    validateMongodbId(blockedUserId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', blockedUserId));
    return UserService.unblockUser(user.userId, blockedUserId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [User], { description: 'Get blocked users' })
  async readBlockedUsers(@Ctx() context: ServerContext): Promise<User[]> {
    const user = getAuthenticatedUser(context);
    return UserDAO.readBlockedUsers(user.userId);
  }

  // ============ MUTE USER MUTATIONS ============

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Mute a user to hide their content from your feed' })
  async muteUser(@Arg('mutedUserId', () => ID) mutedUserId: string, @Ctx() context: ServerContext): Promise<User> {
    const user = getAuthenticatedUser(context);
    validateMongodbId(mutedUserId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', mutedUserId));
    return UserService.muteUser(user.userId, mutedUserId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Unmute a user to show their content in your feed again' })
  async unmuteUser(@Arg('mutedUserId', () => ID) mutedUserId: string, @Ctx() context: ServerContext): Promise<User> {
    const user = getAuthenticatedUser(context);
    validateMongodbId(mutedUserId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', mutedUserId));
    return UserService.unmuteUser(user.userId, mutedUserId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [User], { description: 'Get muted users' })
  async readMutedUsers(@Ctx() context: ServerContext): Promise<User[]> {
    const user = getAuthenticatedUser(context);
    return UserDAO.readMutedUsers(user.userId);
  }

  // ============ MUTE ORGANIZATION MUTATIONS ============

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Mute an organization to hide their content from your feed' })
  async muteOrganization(
    @Arg('organizationId', () => ID) organizationId: string,
    @Ctx() context: ServerContext,
  ): Promise<User> {
    const user = getAuthenticatedUser(context);
    validateMongodbId(organizationId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', organizationId));
    return UserService.muteOrganization(user.userId, organizationId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Unmute an organization to show their content in your feed again' })
  async unmuteOrganization(
    @Arg('organizationId', () => ID) organizationId: string,
    @Ctx() context: ServerContext,
  ): Promise<User> {
    const user = getAuthenticatedUser(context);
    validateMongodbId(organizationId, ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', organizationId));
    return UserService.unmuteOrganization(user.userId, organizationId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [String], { description: 'Get muted organization IDs' })
  async readMutedOrganizationIds(@Ctx() context: ServerContext): Promise<string[]> {
    const user = getAuthenticatedUser(context);
    return UserDAO.readMutedOrganizationIds(user.userId);
  }

  // ============ SESSION STATE MUTATIONS ============

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Save session state for cross-device continuity' })
  async saveSessionState(
    @Arg('input', () => SessionStateInput) input: SessionStateInput,
    @Ctx() context: ServerContext,
  ): Promise<User> {
    const user = getAuthenticatedUser(context);
    return UserDAO.saveSessionState(user.userId, input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => SessionState, { nullable: true, description: 'Retrieve session state for a specific key' })
  async readSessionState(
    @Arg('key', () => String) key: string,
    @Ctx() context: ServerContext,
  ): Promise<SessionState | null> {
    const user = getAuthenticatedUser(context);
    return UserDAO.readSessionState(user.userId, key);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [SessionState], { description: 'Retrieve all session states for the current user' })
  async readAllSessionStates(@Ctx() context: ServerContext): Promise<SessionState[]> {
    const user = getAuthenticatedUser(context);
    return UserDAO.readAllSessionStates(user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Clear session state for a specific key' })
  async clearSessionState(@Arg('key', () => String) key: string, @Ctx() context: ServerContext): Promise<User> {
    const user = getAuthenticatedUser(context);
    return UserDAO.clearSessionState(user.userId, key);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => User, { description: 'Clear all session states for the current user' })
  async clearAllSessionStates(@Ctx() context: ServerContext): Promise<User> {
    const user = getAuthenticatedUser(context);
    return UserDAO.clearAllSessionStates(user.userId);
  }
}
