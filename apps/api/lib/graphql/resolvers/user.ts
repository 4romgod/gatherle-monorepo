import 'reflect-metadata';
import { Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root, Ctx, ID } from 'type-graphql';
import { GraphQLError } from 'graphql';
import { AuthAttemptDAO, EmailVerificationTokenDAO, FollowDAO, UserDAO } from '@/mongodb/dao';
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
import { emitAuthAbuseMetric } from '@/utils/authAbuseMetrics';
import { CustomError, ErrorTypes, getAuthenticatedUser, getRequestIpFromContext } from '@/utils';
import { logger } from '@/utils/logger';
import type { ServerContext } from '@/graphql';
import { EmailService, UserService } from '@/services';

const isAuthenticationFailure = (error: unknown): boolean =>
  error instanceof GraphQLError && error.extensions?.code === 'UNAUTHENTICATED';

const canViewSensitiveUserFields = (context: ServerContext, user: User): boolean => {
  const authenticatedUser = context.user;
  if (!authenticatedUser) {
    return false;
  }

  return (
    authenticatedUser.userRole === UserRole.Admin ||
    authenticatedUser.userRole === UserRole.Host ||
    authenticatedUser.userId === user.userId
  );
};

const sanitizeUserForPublicRead = (user: User): User => ({
  ...user,
  email: '',
  birthdate: undefined,
  phone_number: undefined,
  mutedUserIds: [],
  mutedOrgIds: [],
  blockedUserIds: [],
});

const redactUserIfNeeded = (user: User | null, context: ServerContext): User | null => {
  if (!user) {
    return null;
  }

  return canViewSensitiveUserFields(context, user) ? user : sanitizeUserForPublicRead(user);
};

@Resolver(() => User)
export class UserResolver {
  @FieldResolver(() => Number)
  async followersCount(@Root() user: User): Promise<number> {
    if (!user.userId) {
      return 0;
    }
    return FollowDAO.countFollowers(FollowTargetType.User, user.userId);
  }

  @FieldResolver(() => Number)
  async followingCount(@Root() user: User): Promise<number> {
    if (!user.userId) {
      return 0;
    }

    return FollowDAO.countAcceptedFollowingForUser(user.userId);
  }

  @Mutation(() => UserWithToken, { description: RESOLVER_DESCRIPTIONS.USER.createUser })
  async createUser(
    @Arg('input', () => CreateUserInput, { description: USER_DESCRIPTIONS.CREATE_INPUT }) input: CreateUserInput,
  ): Promise<UserWithToken> {
    validateInput<CreateUserInput>(CreateUserInputSchema, input);
    const result = await UserDAO.create(input);
    // Best-effort — email failure must not roll back a successful registration
    try {
      const plainToken = await EmailVerificationTokenDAO.create(result.userId);
      await EmailService.sendEmailVerification(result.email, plainToken);
      logger.info('[UserResolver] Verification email sent after createUser', { userId: result.userId });
    } catch (err) {
      logger.warn('[UserResolver] Failed to send verification email after createUser', {
        userId: result.userId,
        email: result.email,
        err,
      });
    }
    return result;
  }

  @Mutation(() => UserWithToken, { description: RESOLVER_DESCRIPTIONS.USER.loginUser })
  async loginUser(
    @Arg('input', () => LoginUserInput) input: LoginUserInput,
    @Ctx() context: ServerContext,
  ): Promise<UserWithToken> {
    validateInput<LoginUserInput>(LoginUserInputSchema, input);

    const scopeKeys = [AuthAttemptDAO.buildEmailScopeKey(input.email)];
    const requestIp = getRequestIpFromContext(context);
    if (requestIp) {
      scopeKeys.push(AuthAttemptDAO.buildIpScopeKey(requestIp));
    }

    await AuthAttemptDAO.assertAllowedForScopes(scopeKeys);

    try {
      const user = await UserDAO.login(input);
      await AuthAttemptDAO.clearScopes(scopeKeys).catch((cleanupError) =>
        logger.warn('[UserResolver] Failed to clear auth attempt state after successful login', {
          scopeKeys,
          error: cleanupError,
        }),
      );
      return user;
    } catch (error) {
      if (isAuthenticationFailure(error)) {
        emitAuthAbuseMetric('LoginFailure');
        await AuthAttemptDAO.recordFailureForScopes(scopeKeys).catch((recordError) =>
          logger.warn('[UserResolver] Failed to record auth attempt after login failure', {
            scopeKeys,
            error: recordError,
          }),
        );
      }
      throw error;
    }
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.updateUser })
  async updateUser(@Arg('input', () => UpdateUserInput) input: UpdateUserInput): Promise<User> {
    validateInput<UpdateUserInput>(UpdateUserInputSchema, input);

    const requestedEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : null;
    let emailChanged = false;

    if (requestedEmail !== null) {
      const existingUser = await UserDAO.readUserById(input.userId);
      const previousEmail = (existingUser.email ?? '').trim().toLowerCase();
      emailChanged = requestedEmail !== previousEmail;
    }

    const updatedUser = await UserDAO.updateUser(input);

    if (emailChanged && updatedUser.email) {
      try {
        const plainToken = await EmailVerificationTokenDAO.create(updatedUser.userId);
        await EmailService.sendEmailVerification(updatedUser.email, plainToken);
        logger.info('[UserResolver] Verification email sent after email update', {
          userId: updatedUser.userId,
          email: updatedUser.email,
        });
      } catch (err) {
        logger.warn('[UserResolver] Failed to send verification email after email update', {
          userId: updatedUser.userId,
          email: updatedUser.email,
          err,
        });
      }
    }

    return updatedUser;
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.deleteUserById })
  async deleteUserById(@Arg('userId', () => String) userId: string): Promise<User> {
    validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
    return UserService.deleteById(userId);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.deleteUserByEmail })
  async deleteUserByEmail(@Arg('email', () => String) email: string): Promise<User> {
    validateEmail(email);
    return UserService.deleteByEmail(email);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.deleteUserByUsername })
  async deleteUserByUsername(@Arg('username', () => String) username: string): Promise<User> {
    validateUsername(username);
    return UserService.deleteByUsername(username);
  }

  @Query(() => User, { description: RESOLVER_DESCRIPTIONS.USER.readUserById })
  async readUserById(@Arg('userId', () => String) userId: string, @Ctx() context: ServerContext): Promise<User | null> {
    validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
    return redactUserIfNeeded(await UserDAO.readUserById(userId), context);
  }

  @Query(() => User, { description: RESOLVER_DESCRIPTIONS.USER.readUserByUsername })
  async readUserByUsername(
    @Arg('username', () => String) username: string,
    @Ctx() context: ServerContext,
  ): Promise<User | null> {
    validateUsername(username);
    return redactUserIfNeeded(await UserDAO.readUserByUsername(username), context);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Query(() => User, { description: RESOLVER_DESCRIPTIONS.USER.readUserByEmail })
  async readUserByEmail(
    @Arg('email', () => String) email: string,
    @Ctx() context: ServerContext,
  ): Promise<User | null> {
    validateEmail(email);
    const currentUser = getAuthenticatedUser(context);
    if (
      currentUser.userRole !== UserRole.Admin &&
      currentUser.userRole !== UserRole.Host &&
      currentUser.email?.toLowerCase() !== email.trim().toLowerCase()
    ) {
      throw CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED);
    }
    return UserDAO.readUserByEmail(email);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Query(() => [User], { description: RESOLVER_DESCRIPTIONS.USER.readUsers })
  async readUsers(
    @Arg('options', () => QueryOptionsInput, { nullable: true }) options?: QueryOptionsInput,
    @Ctx() context?: ServerContext,
  ): Promise<User[]> {
    const users = await UserDAO.readUsers(options);
    if (!context) {
      return users.map((user) => sanitizeUserForPublicRead(user));
    }
    return users.map((user) => redactUserIfNeeded(user, context) ?? sanitizeUserForPublicRead(user));
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
