import { User as UserModel, Organization as OrganizationModel } from '@/mongodb/models';
import type {
  User,
  UpdateUserInput,
  CreateUserInput,
  QueryOptionsInput,
  LoginUserInput,
  UserWithToken,
} from '@ntlango/commons/types';
import { UserRole } from '@ntlango/commons/types';
import { ErrorTypes, CustomError, KnownCommonError, transformOptionsToQuery } from '@/utils';
import { GraphQLError } from 'graphql';
import { ERROR_MESSAGES } from '@/validation';
import { generateToken } from '@/utils/auth';
import { logger } from '@/utils/logger';

class UserDAO {
  static async create(userData: CreateUserInput): Promise<UserWithToken> {
    try {
      const savedUser = await UserModel.create(userData);
      const tokenPayload = savedUser.toObject();
      const token = await generateToken(tokenPayload);
      return { ...tokenPayload, token };
    } catch (error) {
      logger.error('Error when creating a new user', error);
      throw KnownCommonError(error);
    }
  }

  static async login({ email, password }: LoginUserInput): Promise<UserWithToken> {
    try {
      const query = UserModel.findOne({ email }).select('+password');
      const user = await query.exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.PASSWORD_MISMATCH, ErrorTypes.UNAUTHENTICATED);
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw CustomError(ERROR_MESSAGES.PASSWORD_MISMATCH, ErrorTypes.UNAUTHENTICATED);
      }

      const jwtToken = await generateToken(user.toObject());
      return { token: jwtToken, ...user.toObject() };
    } catch (error) {
      logger.error('Error when user logging in', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readUserById(userId: string): Promise<User> {
    try {
      const query = UserModel.findById(userId);
      const user = await query.exec();
      if (!user) {
        throw CustomError(`User with id ${userId} does not exist`, ErrorTypes.NOT_FOUND);
      }
      return user.toObject();
    } catch (error) {
      logger.error(`Error reading user by userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readUserByUsername(username: string): Promise<User> {
    try {
      const query = UserModel.findOne({ username });
      const user = await query.exec();
      if (!user) {
        throw CustomError(`User with username ${username} does not exist`, ErrorTypes.NOT_FOUND);
      }
      return user.toObject();
    } catch (error) {
      logger.error(`Error reading user by username ${username}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readUserByEmail(email: string): Promise<User> {
    try {
      const query = UserModel.findOne({ email });
      const user = await query.exec();
      if (!user) {
        throw CustomError(`User with email ${email} does not exist`, ErrorTypes.NOT_FOUND);
      }
      return user.toObject();
    } catch (error) {
      logger.error(`Error reading user by email ${email}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readUsers(options?: QueryOptionsInput): Promise<User[]> {
    try {
      logger.debug('Reading users with options:', options);
      const query = options ? transformOptionsToQuery(UserModel, options) : UserModel.find({});
      const retrieved = await query.exec();
      return retrieved.map((user) => user.toObject());
    } catch (error) {
      logger.error('Error querying users', error);
      throw KnownCommonError(error);
    }
  }

  static async updateUser(user: UpdateUserInput) {
    try {
      const { userId, ...updatableFields } = user;
      const existingUser = await UserModel.findById(userId).exec();
      if (!existingUser) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(
        Object.entries(updatableFields).filter(([_, value]) => value !== undefined),
      );
      Object.assign(existingUser, fieldsToUpdate);
      await existingUser.save();

      return existingUser.toObject();
    } catch (error) {
      logger.error(`Error updating user with userId ${user.userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteUserById(userId: string): Promise<User> {
    try {
      const query = UserModel.findByIdAndDelete(userId);
      const deletedUser = await query.exec();
      if (!deletedUser) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }
      return deletedUser.toObject();
    } catch (error) {
      logger.error(`Error deleting user with userId ${userId}`);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteUserByEmail(email: string): Promise<User> {
    try {
      const query = UserModel.findOneAndDelete({ email });
      const deletedUser = await query.exec();
      if (!deletedUser) {
        throw CustomError('User not found', ErrorTypes.NOT_FOUND);
      }
      return deletedUser.toObject();
    } catch (error) {
      logger.error(`Error deleting user with email ${email}`);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteUserByUsername(username: string): Promise<User> {
    try {
      const query = UserModel.findOneAndDelete({ username });
      const deletedUser = await query.exec();
      if (!deletedUser) {
        throw CustomError('User not found', ErrorTypes.NOT_FOUND);
      }
      return deletedUser.toObject();
    } catch (error) {
      logger.error(`Error deleting user with username ${username}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async promoteUserToAdmin(userId: string): Promise<User> {
    try {
      const user = await UserModel.findById(userId).exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      user.userRole = UserRole.Admin;
      await user.save();

      return user.toObject();
    } catch (error) {
      logger.error(`Error promoting user to Admin with userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async blockUser(userId: string, blockedUserId: string): Promise<User> {
    try {
      if (userId === blockedUserId) {
        throw CustomError('You cannot block yourself', ErrorTypes.BAD_USER_INPUT);
      }

      const [user, blockedUser] = await Promise.all([
        UserModel.findById(userId).exec(),
        UserModel.findById(blockedUserId).exec(),
      ]);

      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      if (!blockedUser) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', blockedUserId), ErrorTypes.NOT_FOUND);
      }

      if (user.blockedUserIds?.includes(blockedUserId)) {
        return user.toObject();
      }

      user.blockedUserIds = user.blockedUserIds || [];
      user.blockedUserIds.push(blockedUserId);
      await user.save();

      return user.toObject();
    } catch (error) {
      logger.error(`Error blocking user ${blockedUserId} for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async unblockUser(userId: string, blockedUserId: string): Promise<User> {
    try {
      const user = await UserModel.findById(userId).exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      if (user.blockedUserIds) {
        user.blockedUserIds = user.blockedUserIds.filter((id) => id !== blockedUserId);
        await user.save();
      }

      return user.toObject();
    } catch (error) {
      logger.error(`Error unblocking user ${blockedUserId} for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readBlockedUsers(userId: string): Promise<User[]> {
    try {
      const user = await UserModel.findById(userId).exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      if (!user.blockedUserIds || user.blockedUserIds.length === 0) {
        return [];
      }

      const blockedUsers = await UserModel.find({
        userId: { $in: user.blockedUserIds },
      }).exec();

      return blockedUsers.map((u) => u.toObject());
    } catch (error) {
      logger.error(`Error reading blocked users for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  // ============ MUTE USER METHODS ============

  static async muteUser(userId: string, mutedUserId: string): Promise<User> {
    try {
      if (userId === mutedUserId) {
        throw CustomError('You cannot mute yourself', ErrorTypes.BAD_USER_INPUT);
      }

      const user = await UserModel.findById(userId).exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      if (user.mutedUserIds?.includes(mutedUserId)) {
        return user.toObject();
      }

      user.mutedUserIds = user.mutedUserIds || [];
      user.mutedUserIds.push(mutedUserId);
      await user.save();

      return user.toObject();
    } catch (error) {
      logger.error(`Error muting user ${mutedUserId} for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async unmuteUser(userId: string, mutedUserId: string): Promise<User> {
    try {
      const user = await UserModel.findById(userId).exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      if (user.mutedUserIds) {
        user.mutedUserIds = user.mutedUserIds.filter((id) => id !== mutedUserId);
        await user.save();
      }

      return user.toObject();
    } catch (error) {
      logger.error(`Error unmuting user ${mutedUserId} for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readMutedUsers(userId: string): Promise<User[]> {
    try {
      const user = await UserModel.findById(userId).exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      if (!user.mutedUserIds || user.mutedUserIds.length === 0) {
        return [];
      }

      const mutedUsers = await UserModel.find({
        userId: { $in: user.mutedUserIds },
      }).exec();

      return mutedUsers.map((u) => u.toObject());
    } catch (error) {
      logger.error(`Error reading muted users for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  // ============ MUTE ORGANIZATION METHODS ============

  static async muteOrganization(userId: string, orgId: string): Promise<User> {
    try {
      const [user, organization] = await Promise.all([
        UserModel.findById(userId).exec(),
        OrganizationModel.findById(orgId).exec(),
      ]);

      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      if (!organization) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', orgId), ErrorTypes.NOT_FOUND);
      }

      if (user.mutedOrgIds?.includes(orgId)) {
        return user.toObject();
      }

      user.mutedOrgIds = user.mutedOrgIds || [];
      user.mutedOrgIds.push(orgId);
      await user.save();

      return user.toObject();
    } catch (error) {
      logger.error(`Error muting organization ${orgId} for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async unmuteOrganization(userId: string, orgId: string): Promise<User> {
    try {
      const user = await UserModel.findById(userId).exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      if (user.mutedOrgIds) {
        user.mutedOrgIds = user.mutedOrgIds.filter((id) => id !== orgId);
        await user.save();
      }

      return user.toObject();
    } catch (error) {
      logger.error(`Error unmuting organization ${orgId} for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readMutedOrganizationIds(userId: string): Promise<string[]> {
    try {
      const user = await UserModel.findById(userId).exec();
      if (!user) {
        throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
      }

      return user.mutedOrgIds || [];
    } catch (error) {
      logger.error(`Error reading muted organization IDs for userId ${userId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async count(filter: Record<string, unknown> = {}): Promise<number> {
    try {
      return UserModel.countDocuments(filter).exec();
    } catch (error) {
      logger.error('Error counting users', error);
      throw KnownCommonError(error);
    }
  }
}

export default UserDAO;
