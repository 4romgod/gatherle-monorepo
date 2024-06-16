import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized} from 'type-graphql';
import {UserDAO} from '@/mongodb/dao';
import {UserType, CreateUserInputType, UpdateUserInputType, LoginUserInputType, UserRole, UserWithTokenType} from '@/graphql/types';
import {CreateUserInputTypeSchema, LoginUserInputTypeSchema, UpdateUserInputTypeSchema} from '@/validation/zod';
import {ERROR_MESSAGES, validateInput, validateMongodbId} from '@/validation';
import {QueryOptionsInput} from '../types/query';
import {RESOLVER_DESCRIPTIONS, USER_DESCRIPTIONS} from '@/constants';

@Resolver()
export class UserResolver {
    @Mutation(() => UserWithTokenType, {description: RESOLVER_DESCRIPTIONS.USER.createUser})
    async createUser(@Arg('input', () => CreateUserInputType, {description: USER_DESCRIPTIONS.CREATE_INPUT}) input: CreateUserInputType): Promise<UserWithTokenType> {
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
        validateMongodbId(input.id, ERROR_MESSAGES.NOT_FOUND('User', 'ID', input.id));
        validateInput<UpdateUserInputType>(UpdateUserInputTypeSchema, input);
        return UserDAO.updateUser(input);
    }

    @Authorized([UserRole.Admin, UserRole.User, UserRole.Host])
    @Mutation(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.deleteUserById})
    async deleteUserById(@Arg('userId') userId: string): Promise<UserType> {
        validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
        return UserDAO.deleteUserById(userId);
    }

    @Query(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.readUserById})
    async readUserById(@Arg('userId') userId: string): Promise<UserType | null> {
        validateMongodbId(userId, ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId));
        return UserDAO.readUserById(userId);
    }

    @Query(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.readUserByUsername})
    async readUserByUsername(@Arg('username') username: string): Promise<UserType | null> {
        return UserDAO.readUserByUsername(username);
    }

    @Query(() => UserType, {description: RESOLVER_DESCRIPTIONS.USER.readUserByEmail})
    async readUserByEmail(@Arg('email') email: string): Promise<UserType | null> {
        return UserDAO.readUserByEmail(email);
    }

    @Query(() => [UserType], {description: RESOLVER_DESCRIPTIONS.USER.readUsers})
    async readUsers(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<UserType[]> {
        return UserDAO.readUsers(options);
    }
}
