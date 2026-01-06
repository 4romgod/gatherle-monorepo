import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root, Ctx} from 'type-graphql';
import {UserDAO} from '@/mongodb/dao';
import {User, CreateUserInput, UpdateUserInput, LoginUserInput, UserRole, UserWithToken, QueryOptionsInput, EventCategory} from '@ntlango/commons/types';
import {CreateUserInputSchema, LoginUserInputSchema, UpdateUserInputSchema} from '@/validation/zod';
import {ERROR_MESSAGES, validateEmail, validateInput, validateMongodbId, validateUsername} from '@/validation';
import {RESOLVER_DESCRIPTIONS, USER_DESCRIPTIONS} from '@/constants';
import type {ServerContext} from '@/graphql';

@Resolver(() => User)
export class UserResolver {
  @Mutation(() => UserWithToken, {description: RESOLVER_DESCRIPTIONS.USER.createUser})
  async createUser(
    @Arg('input', () => CreateUserInput, {description: USER_DESCRIPTIONS.CREATE_INPUT}) input: CreateUserInput,
  ): Promise<UserWithToken> {
    validateInput<CreateUserInput>(CreateUserInputSchema, input);
    return UserDAO.create(input);
  }

  // TODO https://hygraph.com/learn/graphql/authentication-and-authorization
  @Mutation(() => UserWithToken, {description: RESOLVER_DESCRIPTIONS.USER.loginUser})
  async loginUser(@Arg('input', () => LoginUserInput) input: LoginUserInput): Promise<UserWithToken> {
    validateInput<LoginUserInput>(LoginUserInputSchema, input);
    return UserDAO.login(input);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, {description: RESOLVER_DESCRIPTIONS.USER.updateUser})
  async updateUser(@Arg('input', () => UpdateUserInput) input: UpdateUserInput): Promise<User> {
    validateInput<UpdateUserInput>(UpdateUserInputSchema, input);
    return UserDAO.updateUser(input);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, {description: RESOLVER_DESCRIPTIONS.USER.deleteUserById})
  async deleteUserById(@Arg('userId', () => String) userId: string): Promise<User> {
    validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
    return UserDAO.deleteUserById(userId);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, {description: RESOLVER_DESCRIPTIONS.USER.deleteUserByEmail})
  async deleteUserByEmail(@Arg('email', () => String) email: string): Promise<User> {
    validateEmail(email);
    return UserDAO.deleteUserByEmail(email);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => User, {description: RESOLVER_DESCRIPTIONS.USER.deleteUserByUsername})
  async deleteUserByUsername(@Arg('username', () => String) username: string): Promise<User> {
    validateUsername(username);
    return UserDAO.deleteUserByUsername(username);
  }

  @Query(() => User, {description: RESOLVER_DESCRIPTIONS.USER.readUserById})
  async readUserById(@Arg('userId', () => String) userId: string): Promise<User | null> {
    validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
    return UserDAO.readUserById(userId);
  }

  @Query(() => User, {description: RESOLVER_DESCRIPTIONS.USER.readUserByUsername})
  async readUserByUsername(@Arg('username', () => String) username: string): Promise<User | null> {
    return UserDAO.readUserByUsername(username);
  }

  @Query(() => User, {description: RESOLVER_DESCRIPTIONS.USER.readUserByEmail})
  async readUserByEmail(@Arg('email', () => String) email: string): Promise<User | null> {
    return UserDAO.readUserByEmail(email);
  }

  @Query(() => [User], {description: RESOLVER_DESCRIPTIONS.USER.readUsers})
  async readUsers(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<User[]> {
    return UserDAO.readUsers(options);
  }

  @FieldResolver(() => [EventCategory], {nullable: true})
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
    const categoryIds = user.interests.map((ref) => (typeof ref === 'string' ? ref : (ref as any)._id?.toString() || ref.toString()));
    const categories = await Promise.all(categoryIds.map((id) => context.loaders.eventCategory.load(id)));
    return categories.filter((c): c is EventCategory => c !== null);
  }
}
