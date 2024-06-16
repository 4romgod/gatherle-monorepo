import {User} from '@/mongodb/models';
import {
    UserType,
    UpdateUserInputType,
    CreateUserInputType,
    QueryOptionsInput,
    LoginUserInputType,
    UserRole,
    UserWithTokenType,
} from '@/graphql/types';
import {ErrorTypes, CustomError, KnownCommonError, transformOptionsToQuery} from '@/utils';
import bcrypt from 'bcrypt';
import {GraphQLError} from 'graphql';
import {ERROR_MESSAGES} from '@/validation';
import {generateToken} from '@/utils/auth';

class UserDAO {
    static async create(userData: CreateUserInputType): Promise<UserWithTokenType> {
        try {
            const userProps = {
                ...userData,
                userRole: UserRole.User, // TODO default userRole, do better
                username: userData.username ?? userData.email.split('@')[0],
                email: userData.email.toLocaleLowerCase(),
                encrypted_password: await bcrypt.hash(userData.password, 10),
            };
            const savedUser = await User.create(userProps);
            const tokenPayload = savedUser.toObject({getters: true});
            const token = generateToken(tokenPayload);

            return {...tokenPayload, token};
        } catch (error) {
            console.log('Error when creating a new user', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async login(loginData: LoginUserInputType): Promise<UserWithTokenType> {
        try {
            const query = User.findOne({email: loginData.email});
            const user = await query.exec();
            if (user) {
                if (await bcrypt.compare(loginData.password, user.encrypted_password)) {
                    const jwtPayload = {...user.toObject({getters: true})};
                    const jwtToken = generateToken(jwtPayload);
                    return {token: jwtToken, ...jwtPayload};
                } else {
                    throw CustomError(ERROR_MESSAGES.PASSWORD_MISSMATCH, ErrorTypes.UNAUTHENTICATED);
                }
            } else {
                throw CustomError(ERROR_MESSAGES.PASSWORD_MISSMATCH, ErrorTypes.UNAUTHENTICATED);
            }
        } catch (error) {
            console.log('Error when user logging in', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async readUserById(userId: string): Promise<UserType> {
        try {
            const query = User.findById(userId);
            const user = await query.exec();
            if (!user) {
                throw CustomError(`User with id ${userId} does not exist`, ErrorTypes.NOT_FOUND);
            }
            return user;
        } catch (error) {
            console.log('Error reading user by id', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async readUserByUsername(username: string): Promise<UserType> {
        try {
            const query = User.findOne({username});
            const user = await query.exec();
            if (!user) {
                throw CustomError(`User with username ${username} does not exist`, ErrorTypes.NOT_FOUND);
            }
            return user;
        } catch (error) {
            console.log('Error reading user by username', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async readUserByEmail(email: string): Promise<UserType> {
        try {
            const query = User.findOne({email});
            const user = await query.exec();
            if (!user) {
                throw CustomError(`User with email ${email} does not exist`, ErrorTypes.NOT_FOUND);
            }
            return user;
        } catch (error) {
            console.log('Error reading user by email', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async readUsers(options?: QueryOptionsInput): Promise<UserType[]> {
        try {
            const query = options ? transformOptionsToQuery(User, options) : User.find({});
            return await query.exec();
        } catch (error) {
            console.log('Error querying users', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async updateUser(user: UpdateUserInputType) {
        try {
            let encrypted_password: string | undefined;
            if (user.password) {
                encrypted_password = await bcrypt.hash(user.password, 10);
                delete user.password;
            }
            const {id, ...updatableFields} = user;
            const query = User.findByIdAndUpdate(user.id, {...updatableFields, encrypted_password}, {new: true});
            const updatedUser = await query.exec();
            if (!updatedUser) {
                throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', id), ErrorTypes.NOT_FOUND);
            }
            return updatedUser;
        } catch (error) {
            console.log('Error updating users', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async deleteUserById(userId: string): Promise<UserType> {
        try {
            const query = User.findByIdAndDelete(userId);
            const deletedUser = await query.exec();
            if (!deletedUser) {
                throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
            }
            return deletedUser;
        } catch (error) {
            console.log(`Error deleting user with id ${userId}`, error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async deleteUserByEmail(email: string): Promise<UserType> {
        try {
            const query = User.findOneAndDelete({email});
            const deletedUser = await query.exec();
            if (!deletedUser) {
                throw CustomError('User not found', ErrorTypes.NOT_FOUND);
            }
            return deletedUser;
        } catch (error) {
            console.log(`Error deleting user with email ${email}`, error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }
}

export default UserDAO;
