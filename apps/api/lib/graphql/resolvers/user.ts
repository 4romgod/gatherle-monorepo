import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query} from 'type-graphql';
import {UserDAO} from '../../mongodb/dao';
import {UserType, CreateUserInputType, UpdateUserInputType} from '../types';

@Resolver()
export class UserResolver {
    @Mutation(() => UserType)
    async createUser(@Arg('input', () => CreateUserInputType) input: CreateUserInputType): Promise<UserType> {
        return UserDAO.create(input);
    }

    @Mutation(() => UserType)
    async updateUser(@Arg('input', () => UpdateUserInputType) input: UpdateUserInputType): Promise<UserType> {
        return UserDAO.updateUser(input);
    }

    @Mutation(() => UserType)
    async deleteUser(@Arg('id') id: string): Promise<UserType> {
        return UserDAO.deleteUser(id);
    }

    @Query(() => UserType)
    async readUserById(@Arg('id') id: string): Promise<UserType | null> {
        return UserDAO.readUserById(id);
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
