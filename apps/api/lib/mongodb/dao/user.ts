import { User as UserModel, Organization as OrganizationModel } from '@/mongodb/models';
import type {
  User,
  UpdateUserInput,
  CreateUserInput,
  QueryOptionsInput,
  FilterInput,
  LoginUserInput,
  UserWithToken,
  SessionStateInput,
  SessionState,
} from '@gatherle/commons/types';
import { FilterOperatorInput, UserRole } from '@gatherle/commons/types';
import { ErrorTypes, CustomError, KnownCommonError, transformOptionsToQuery } from '@/utils';
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
      logger.error('Error when creating a new user', { error });
      throw KnownCommonError(error);
    }
  }

  static async login({ email, password }: LoginUserInput): Promise<UserWithToken> {
    let user;
    try {
      const query = UserModel.findOne({ email }).select('+password');
      user = await query.exec();
    } catch (error) {
      logger.error('Error when user logging in', { error });
      throw KnownCommonError(error);
    }

    if (!user) {
      throw CustomError(ERROR_MESSAGES.PASSWORD_MISMATCH, ErrorTypes.UNAUTHENTICATED);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw CustomError(ERROR_MESSAGES.PASSWORD_MISMATCH, ErrorTypes.UNAUTHENTICATED);
    }

    const jwtToken = await generateToken(user.toObject());
    return { token: jwtToken, ...user.toObject() };
  }

  static async readUserById(userId: string): Promise<User> {
    let user;
    try {
      const query = UserModel.findById(userId);
      user = await query.exec();
    } catch (error) {
      logger.error(`Error reading user by userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(`User with id ${userId} does not exist`, ErrorTypes.NOT_FOUND);
    }
    return user.toObject();
  }

  static async readUserByUsername(username: string): Promise<User> {
    let user;
    try {
      const query = UserModel.findOne({ username });
      user = await query.exec();
    } catch (error) {
      logger.error(`Error reading user by username ${username}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(`User with username ${username} does not exist`, ErrorTypes.NOT_FOUND);
    }
    return user.toObject();
  }

  static async readUserByEmail(email: string): Promise<User> {
    let user;
    try {
      const query = UserModel.findOne({ email });
      user = await query.exec();
    } catch (error) {
      logger.error(`Error reading user by email ${email}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(`User with email ${email} does not exist`, ErrorTypes.NOT_FOUND);
    }
    return user.toObject();
  }

  static async readUsers(options?: QueryOptionsInput): Promise<User[]> {
    try {
      logger.debug('Reading users with options:', options);
      const testUserExclusionFilter: FilterInput = {
        field: 'isTestUser',
        operator: FilterOperatorInput.ne,
        value: true,
      };

      const optionsWithTestUserExclusion: QueryOptionsInput = options
        ? {
            ...options,
            filters: [...(options.filters ?? []), testUserExclusionFilter],
          }
        : {
            filters: [testUserExclusionFilter],
          };

      const query = transformOptionsToQuery(UserModel, optionsWithTestUserExclusion);
      const retrieved = await query.exec();
      return retrieved.map((user) => user.toObject());
    } catch (error) {
      logger.error('Error querying users', { error });
      throw KnownCommonError(error);
    }
  }

  static async updateUser(user: UpdateUserInput) {
    const { userId, ...updatableFields } = user;
    let existingUser;
    try {
      existingUser = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for update ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!existingUser) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    try {
      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(
        Object.entries(updatableFields).filter(([_, value]) => value !== undefined),
      );
      Object.assign(existingUser, fieldsToUpdate);
      await existingUser.save();
      return existingUser.toObject();
    } catch (error) {
      logger.error(`Error updating user with userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async deleteUserById(userId: string): Promise<User> {
    let deletedUser;
    try {
      const query = UserModel.findByIdAndDelete(userId);
      deletedUser = await query.exec();
    } catch (error) {
      logger.error(`Error deleting user with userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedUser) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }
    return deletedUser.toObject();
  }

  static async deleteUserByEmail(email: string): Promise<User> {
    let deletedUser;
    try {
      const query = UserModel.findOneAndDelete({ email });
      deletedUser = await query.exec();
    } catch (error) {
      logger.error(`Error deleting user with email ${email}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedUser) {
      throw CustomError('User not found', ErrorTypes.NOT_FOUND);
    }
    return deletedUser.toObject();
  }

  static async deleteUserByUsername(username: string): Promise<User> {
    let deletedUser;
    try {
      const query = UserModel.findOneAndDelete({ username });
      deletedUser = await query.exec();
    } catch (error) {
      logger.error(`Error deleting user with username ${username}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedUser) {
      throw CustomError('User not found', ErrorTypes.NOT_FOUND);
    }
    return deletedUser.toObject();
  }

  static async promoteUserToAdmin(userId: string): Promise<User> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for promotion ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    try {
      user.userRole = UserRole.Admin;
      await user.save();
      return user.toObject();
    } catch (error) {
      logger.error(`Error promoting user to Admin with userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async blockUser(userId: string, blockedUserId: string): Promise<User> {
    if (userId === blockedUserId) {
      throw CustomError('You cannot block yourself', ErrorTypes.BAD_USER_INPUT);
    }

    let user;
    let blockedUser;
    try {
      [user, blockedUser] = await Promise.all([
        UserModel.findById(userId).exec(),
        UserModel.findById(blockedUserId).exec(),
      ]);
    } catch (error) {
      logger.error(`Error finding users for block operation`, { error });
      throw KnownCommonError(error);
    }

    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    if (!blockedUser) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', blockedUserId), ErrorTypes.NOT_FOUND);
    }

    if (user.blockedUserIds?.includes(blockedUserId)) {
      return user.toObject();
    }

    try {
      user.blockedUserIds = user.blockedUserIds || [];
      user.blockedUserIds.push(blockedUserId);
      await user.save();
      return user.toObject();
    } catch (error) {
      logger.error(`Error blocking user ${blockedUserId} for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async unblockUser(userId: string, blockedUserId: string): Promise<User> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for unblock ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    try {
      if (user.blockedUserIds) {
        user.blockedUserIds = user.blockedUserIds.filter((id) => id !== blockedUserId);
        await user.save();
      }
      return user.toObject();
    } catch (error) {
      logger.error(`Error unblocking user ${blockedUserId} for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async readBlockedUsers(userId: string): Promise<User[]> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for blocked users list ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    if (!user.blockedUserIds || user.blockedUserIds.length === 0) {
      return [];
    }

    try {
      const blockedUsers = await UserModel.find({
        userId: { $in: user.blockedUserIds },
      }).exec();
      return blockedUsers.map((u) => u.toObject());
    } catch (error) {
      logger.error(`Error reading blocked users for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  // ============ MUTE USER METHODS ============

  static async muteUser(userId: string, mutedUserId: string): Promise<User> {
    if (userId === mutedUserId) {
      throw CustomError('You cannot mute yourself', ErrorTypes.BAD_USER_INPUT);
    }

    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for mute ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    if (user.mutedUserIds?.includes(mutedUserId)) {
      return user.toObject();
    }

    try {
      user.mutedUserIds = user.mutedUserIds || [];
      user.mutedUserIds.push(mutedUserId);
      await user.save();
      return user.toObject();
    } catch (error) {
      logger.error(`Error muting user ${mutedUserId} for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async unmuteUser(userId: string, mutedUserId: string): Promise<User> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for unmute ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    try {
      if (user.mutedUserIds) {
        user.mutedUserIds = user.mutedUserIds.filter((id) => id !== mutedUserId);
        await user.save();
      }
      return user.toObject();
    } catch (error) {
      logger.error(`Error unmuting user ${mutedUserId} for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async readMutedUsers(userId: string): Promise<User[]> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for muted users list ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    if (!user.mutedUserIds || user.mutedUserIds.length === 0) {
      return [];
    }

    try {
      const mutedUsers = await UserModel.find({
        userId: { $in: user.mutedUserIds },
      }).exec();
      return mutedUsers.map((u) => u.toObject());
    } catch (error) {
      logger.error(`Error reading muted users for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  // ============ MUTE ORGANIZATION METHODS ============

  static async muteOrganization(userId: string, orgId: string): Promise<User> {
    let user;
    let organization;
    try {
      [user, organization] = await Promise.all([
        UserModel.findById(userId).exec(),
        OrganizationModel.findById(orgId).exec(),
      ]);
    } catch (error) {
      logger.error(`Error finding entities for mute organization`, { error });
      throw KnownCommonError(error);
    }

    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    if (!organization) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', orgId), ErrorTypes.NOT_FOUND);
    }

    if (user.mutedOrgIds?.includes(orgId)) {
      return user.toObject();
    }

    try {
      user.mutedOrgIds = user.mutedOrgIds || [];
      user.mutedOrgIds.push(orgId);
      await user.save();
      return user.toObject();
    } catch (error) {
      logger.error(`Error muting organization ${orgId} for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async unmuteOrganization(userId: string, orgId: string): Promise<User> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for unmute organization ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    try {
      if (user.mutedOrgIds) {
        user.mutedOrgIds = user.mutedOrgIds.filter((id) => id !== orgId);
        await user.save();
      }
      return user.toObject();
    } catch (error) {
      logger.error(`Error unmuting organization ${orgId} for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async readMutedOrganizationIds(userId: string): Promise<string[]> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for muted org IDs ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    return user.mutedOrgIds || [];
  }

  static async count(filter: Record<string, unknown> = {}): Promise<number> {
    try {
      return UserModel.countDocuments(filter).exec();
    } catch (error) {
      logger.error('Error counting users', { error });
      throw KnownCommonError(error);
    }
  }

  static async countByInterestCategoryIds(categoryIds: string[]): Promise<Map<string, number>> {
    try {
      const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));
      if (uniqueCategoryIds.length === 0) {
        return new Map<string, number>();
      }

      const aggregated = await UserModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            interests: { $in: uniqueCategoryIds },
          },
        },
        { $unwind: '$interests' },
        {
          $match: {
            interests: { $in: uniqueCategoryIds },
          },
        },
        {
          $group: {
            _id: '$interests',
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap = new Map<string, number>(uniqueCategoryIds.map((id) => [id, 0]));
      aggregated.forEach((row) => {
        countMap.set(row._id, row.count);
      });

      return countMap;
    } catch (error) {
      logger.error('Error counting users by interest category IDs', { error, categoryIds });
      throw KnownCommonError(error);
    }
  }

  // ============ SESSION STATE METHODS ============

  static async saveSessionState(userId: string, input: SessionStateInput): Promise<User> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for session state save ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    try {
      // Initialize preferences.sessionState if it doesn't exist
      if (!user.preferences) {
        user.preferences = { sessionState: [] };
      }
      if (!user.preferences.sessionState) {
        user.preferences.sessionState = [];
      }

      // Find existing state with this key
      const existingIndex = user.preferences.sessionState.findIndex((state) => state.key === input.key);

      const sessionState: SessionState = {
        key: input.key,
        value: input.value,
        version: input.version || 1,
        updatedAt: new Date(),
      };

      if (existingIndex >= 0) {
        // Update existing state
        user.preferences.sessionState[existingIndex] = sessionState;
      } else {
        // Add new state
        user.preferences.sessionState.push(sessionState);
      }

      // NOTE: We are mutating a nested object/array on `preferences` in place.
      // Mongoose does not always detect deep changes on mixed or nested structures,
      // so without explicitly marking `preferences` as modified these updates may
      // be silently ignored when saving the document.
      // Do not remove this call unless you also change how `preferences` is updated
      // and have verified that Mongoose change tracking still persists the changes.
      user.markModified('preferences');
      await user.save();

      return user.toObject();
    } catch (error) {
      logger.error(`Error saving session state for userId ${userId}, key ${input.key}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async readSessionState(userId: string, key: string): Promise<SessionState | null> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for session state read ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    const state = user.preferences?.sessionState?.find((s) => s.key === key);
    return state || null;
  }

  static async readAllSessionStates(userId: string): Promise<SessionState[]> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for all session states ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    return user.preferences?.sessionState || [];
  }

  static async clearSessionState(userId: string, key: string): Promise<User> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for session state clear ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    try {
      if (user.preferences?.sessionState) {
        user.preferences.sessionState = user.preferences.sessionState.filter((s) => s.key !== key);
        user.markModified('preferences');
        await user.save();
      }
      return user.toObject();
    } catch (error) {
      logger.error(`Error clearing session state for userId ${userId}, key ${key}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async clearAllSessionStates(userId: string): Promise<User> {
    let user;
    try {
      user = await UserModel.findById(userId).exec();
    } catch (error) {
      logger.error(`Error finding user for clear all session states ${userId}`, { error });
      throw KnownCommonError(error);
    }
    if (!user) {
      throw CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', userId), ErrorTypes.NOT_FOUND);
    }

    try {
      if (user.preferences) {
        user.preferences.sessionState = [];
        user.markModified('preferences');
        await user.save();
      }
      return user.toObject();
    } catch (error) {
      logger.error(`Error clearing all session states for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }
}

export default UserDAO;
