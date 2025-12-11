import {User as UserModel} from '@/mongodb/models';
import {
  User,
  UpdateUserInput,
  CreateUserInput,
  QueryOptionsInput,
  LoginUserInput,
  UserWithToken,
  UserRole,
} from '@ntlango/commons/types';
import {ErrorTypes, CustomError, KnownCommonError, transformOptionsToQuery} from '@/utils';
import {GraphQLError} from 'graphql';
import {ERROR_MESSAGES} from '@/validation';
import {generateToken} from '@/utils/auth';

class UserDAO {
  static async create(userData: CreateUserInput): Promise<UserWithToken> {
    try {
      const savedUser = await (await UserModel.create(userData)).populate('interests'); // TODO does this work?
      const tokenPayload = savedUser.toObject();
      const token = await generateToken(tokenPayload);
      return {...tokenPayload, token};
    } catch (error) {
      console.log('Error when creating a new user', error);
      throw KnownCommonError(error);
    }
  }

  static async login({email, password}: LoginUserInput): Promise<UserWithToken> {
    try {
      const query = UserModel.findOne({email}).select('+password').populate('interests');
      const user = await query.exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.PASSWORD_MISSMATCH, ErrorTypes.UNAUTHENTICATED);
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw CustomError(ERROR_MESSAGES.PASSWORD_MISSMATCH, ErrorTypes.UNAUTHENTICATED);
      }

      const jwtToken = await generateToken(user.toObject());
      return {token: jwtToken, ...user.toObject()};
    } catch (error) {
      console.log('Error when user logging in', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readUserById(userId: string): Promise<User> {
    try {
      const query = UserModel.findById(userId).populate('interests');
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

  static async readUserByUsername(username: string): Promise<User> {
    try {
      const query = UserModel.findOne({username}).populate('interests');
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

  static async readUserByEmail(email: string): Promise<User> {
    try {
      const query = UserModel.findOne({email}).populate('interests');
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

  static async readUsers(options?: QueryOptionsInput): Promise<User[]> {
    try {
      const query = options ? transformOptionsToQuery(UserModel, options) : UserModel.find({}).populate('interests');
      const retrieved = await query.exec();
      return retrieved.map((user) => user.toObject());
    } catch (error) {
      console.log('Error querying users', error);
      throw KnownCommonError(error);
    }
  }

  static async updateUser(user: UpdateUserInput) {
    try {
      const {userId, ...updatableFields} = user;
      const query = UserModel.findByIdAndUpdate(userId, updatableFields, {new: true}).populate('interests');
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

  static async deleteUserById(userId: string): Promise<User> {
    try {
      const query = UserModel.findByIdAndDelete(userId).populate('interests');
      const deletedUser = await query.exec();
      if (!deletedUser) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }
      return deletedUser.toObject();
    } catch (error) {
      console.log(`Error deleting user with userId ${userId}`);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteUserByEmail(email: string): Promise<User> {
    try {
      const query = UserModel.findOneAndDelete({email}).populate('interests');
      const deletedUser = await query.exec();
      if (!deletedUser) {
        throw CustomError('User not found', ErrorTypes.NOT_FOUND);
      }
      return deletedUser.toObject();
    } catch (error) {
      console.log(`Error deleting user with email ${email}`);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteUserByUsername(username: string): Promise<User> {
    try {
      const query = UserModel.findOneAndDelete({username}).populate('interests');
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

  static async promoteUserToAdmin(userId: string): Promise<User> {
    try {
      const query = UserModel.findByIdAndUpdate(userId, {userRole: UserRole.Admin}, {new: true}).populate('interests');
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
