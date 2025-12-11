import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized} from 'type-graphql';
import {UserDAO} from '@/mongodb/dao';
import {
  UserType,
  CreateUserInputType,
  UpdateUserInputType,
  LoginUserInputType,
  UserRole,
  UserWithTokenType,
  QueryOptionsInput,
} from '@ntlango/commons/types';
import {CreateUserInputTypeSchema, LoginUserInputTypeSchema, UpdateUserInputTypeSchema} from '@/validation/zod';
import {ERROR_MESSAGES, validateEmail, validateInput, validateMongodbId, validateUsername} from '@/validation';
import {RESOLVER_DESCRIPTIONS, USER_DESCRIPTIONS} from '@/constants';

@Resolver()
export class UserResolver {
  @Mutation(() => UserWithTokenType, {description: RESOLVER_DESCRIPTIONS.USER.createUser})
  async createUser(
    @Arg('input', () => CreateUserInputType, {description: USER_DESCRIPTIONS.CREATE_INPUT}) input: CreateUserInputType,
  ): Promise<UserWithTokenType> {
    validateInput<CreateUserInputType>(CreateUserInputTypeSchema, input);
    return UserDAO.create(input);
  }

  // TODO https://hygraph.com/learn/graphql/authentication-and-authorization
  @Mutation(() => UserWithTokenType, {description: RESOLVER_DESCRIPTIONS.USER.loginUser})
  async loginUser(@Arg('input', () => LoginUserInputType) input: LoginUserInputType): Promise<UserWithTokenType> {
    validateInput<LoginUserInputType>(LoginUserInputTypeSchema, input);
    return UserDAO.login(input);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.updateUser})
  async updateUser(@Arg('input', () => UpdateUserInputType) input: UpdateUserInputType): Promise<UserType> {
    validateInput<UpdateUserInputType>(UpdateUserInputTypeSchema, input);
    return UserDAO.updateUser(input);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.deleteUserById})
  async deleteUserById(@Arg('userId', () => String) userId: string): Promise<UserType> {
    validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
    return UserDAO.deleteUserById(userId);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.deleteUserByEmail})
  async deleteUserByEmail(@Arg('email', () => String) email: string): Promise<UserType> {
    validateEmail(email);
    return UserDAO.deleteUserByEmail(email);
  }

  @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
  @Mutation(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.deleteUserByUsername})
  async deleteUserByUsername(@Arg('username', () => String) username: string): Promise<UserType> {
    validateUsername(username);
    return UserDAO.deleteUserByUsername(username);
  }

  @Query(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.readUserById})
  async readUserById(@Arg('userId', () => String) userId: string): Promise<UserType | null> {
    validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
    return UserDAO.readUserById(userId);
  }

  @Query(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.readUserByUsername})
  async readUserByUsername(@Arg('username', () => String) username: string): Promise<UserType | null> {
    return UserDAO.readUserByUsername(username);
  }

  @Query(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.readUserByEmail})
  async readUserByEmail(@Arg('email', () => String) email: string): Promise<UserType | null> {
    return UserDAO.readUserByEmail(email);
  }

  @Query(() => [UserType], {description: RESOLVER_DESCRIPTIONS.USER.readUsers})
  async readUsers(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<UserType[]> {
    return UserDAO.readUsers(options);
  }
}
