import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query} from 'type-graphql';
import {UserDAO} from '../../mongodb/dao';
import {UserType, CreateUserInputType, UpdateUserInputType, LoginUserInputType} from '../types';
import {ERROR_MESSAGES, validateInput, validateMongodbId} from '../../utils/validators';
import {CreateUserInputTypeSchema, LoginUserInputTypeSchema, UpdateUserInputTypeSchema} from '../types/schema';

@Resolver()
export class UserResolver {
    @Mutation(() => UserType)
    async createUser(@Arg('input', () => CreateUserInputType) input: CreateUserInputType): Promise<UserType> {
        validateInput<CreateUserInputType>(CreateUserInputTypeSchema, input);
        return UserDAO.create(input);
    }

    // TODO https://hygraph.com/learn/graphql/authentication-and-authorization
    @Mutation(() => UserType)
    async loginUser(@Arg('input', () => LoginUserInputType) input: LoginUserInputType): Promise<UserType> {
        validateInput<LoginUserInputType>(LoginUserInputTypeSchema, input);
        return UserDAO.login(input);
    }

    @Mutation(() => UserType)
    async updateUser(@Arg('input', () => UpdateUserInputType) input: UpdateUserInputType): Promise<UserType> {
        validateMongodbId(input.id, ERROR_MESSAGES.NOT_FOUND('User', 'ID', input.id));
        validateInput<UpdateUserInputType>(UpdateUserInputTypeSchema, input);
        return UserDAO.updateUser(input);
    }

    @Mutation(() => UserType)
    async deleteUserById(@Arg('id') id: string): Promise<UserType> {
        validateMongodbId(id, ERROR_MESSAGES.NOT_FOUND('User', 'ID', id));
        return UserDAO.deleteUserById(id);
    }

    @Query(() => UserType)
    async readUserById(@Arg('id') id: string): Promise<UserType | null> {
        validateMongodbId(id, ERROR_MESSAGES.NOT_FOUND('User', 'ID', id));
        return UserDAO.readUserById(id);
    }

    @Query(() => UserType)
    async readUserByUsername(@Arg('username') username: string): Promise<UserType | null> {
        return UserDAO.readUserByUsername(username);
    }

    @Query(() => [UserType])
    async readUsers(): Promise<UserType[]> {
        return UserDAO.readUsers();
    }

    @Query(() => [UserType])
    async queryUsers(@Arg('gender') gender: string): Promise<UserType[]> {
        return UserDAO.readUsers({gender});
    }
}
