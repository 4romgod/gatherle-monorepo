import {User} from '@/mongodb/models';
import {
    UserType,
    UpdateUserInputType,
    CreateUserInputType,
    QueryOptionsInput,
    LoginUserInputType,
    UserWithTokenType,
    UserRole,
} from '@/graphql/types';
import {ErrorTypes, CustomError, KnownCommonError, transformOptionsToQuery} from '@/utils';
import {GraphQLError} from 'graphql';
import {ERROR_MESSAGES} from '@/validation';
import {generateToken} from '@/utils/auth';

class UserDAO {
    static async create(userData: CreateUserInputType): Promise<UserWithTokenType> {
        try {
            const savedUser = await User.create(userData);
            const tokenPayload = savedUser.toObject();
            const token = generateToken(tokenPayload);
            return {...tokenPayload, token};
        } catch (error) {
            console.log('Error when creating a new user', error);
            throw KnownCommonError(error);
        }
    }

    static async login({email, password}: LoginUserInputType): Promise<UserWithTokenType> {
        try {
            const query = User.findOne({email}).select('+password');
            const user = await query.exec();
            if (!user) {
                throw CustomError(ERROR_MESSAGES.PASSWORD_MISSMATCH, ErrorTypes.UNAUTHENTICATED);
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                throw CustomError(ERROR_MESSAGES.PASSWORD_MISSMATCH, ErrorTypes.UNAUTHENTICATED);
            }

            const jwtToken = generateToken(user.toObject());
            return {token: jwtToken, ...user.toObject()};
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
            return user.toObject();
        } catch (error) {
            console.log(`Error reading user by userId ${userId}`, error);
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
            return user.toObject();
        } catch (error) {
            console.log(`Error reading user by username ${username}`, error);
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
            return user.toObject();
        } catch (error) {
            console.log(`Error reading user by email ${email}`, error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async readUsers(options?: QueryOptionsInput): Promise<UserType[]> {
        try {
            const query = options ? transformOptionsToQuery(User, options) : User.find({});
            const retrieved = await query.exec();
            return retrieved.map((user) => user.toObject());
        } catch (error) {
            console.log('Error querying users', error);
            throw KnownCommonError(error);
        }
    }

    static async updateUser(user: UpdateUserInputType) {
        try {
            const {userId, ...updatableFields} = user;
            const query = User.findByIdAndUpdate(userId, updatableFields, {new: true});
            const updatedUser = await query.exec();
            if (!updatedUser) {
                throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
            }
            return updatedUser.toObject();
        } catch (error) {
            console.log(`Error updating user with userId ${user.userId}`, error);
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
            return deletedUser.toObject();
        } catch (error) {
            console.log(`Error deleting user with userId ${userId}`, error);
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
            return deletedUser.toObject();
        } catch (error) {
            console.log(`Error deleting user with email ${email}`, error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async deleteUserByUsername(username: string): Promise<UserType> {
        try {
            const query = User.findOneAndDelete({username});
            const deletedUser = await query.exec();
            if (!deletedUser) {
                throw CustomError('User not found', ErrorTypes.NOT_FOUND);
            }
            return deletedUser.toObject();
        } catch (error) {
            console.log(`Error deleting user with username ${username}`, error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async promoteUserToAdmin(userId: string): Promise<UserType> {
        try {
            const query = User.findByIdAndUpdate(userId, {userRole: UserRole.Admin}, {new: true});
            const updatedUser = await query.exec();
            if (!updatedUser) {
                throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
            }
            return updatedUser.toObject();
        } catch (error) {
            console.log(`Error promoting user to Admin with userId ${userId}`, error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }
}

export default UserDAO;
