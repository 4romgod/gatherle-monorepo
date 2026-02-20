import type { User } from '@gatherle/commons/types';
import { FollowTargetType } from '@gatherle/commons/types';
import { UserDAO, FollowDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

/**
 * User service for operations with side effects
 *
 * Use this service (not UserDAO directly) when:
 * - Blocking/unblocking users (removes follow relationships)
 * - Any operation that affects multiple entities
 *
 * Use UserDAO directly for:
 * - Simple CRUD operations (create, read, update, delete)
 * - Single-entity operations without side effects
 */
class UserService {
  /**
   * Block a user
   * - Removes follow relationships in both directions
   * - Adds user to blocked list
   */
  static async blockUser(userId: string, blockedUserId: string): Promise<User> {
    logger.debug(`[UserService.blockUser] User ${userId} blocking ${blockedUserId}`);

    // Remove follow relationships in both directions (fire and forget, ignore errors)
    const removeFollows = async () => {
      try {
        // Remove: userId following blockedUser
        await FollowDAO.remove({
          followerUserId: userId,
          targetType: FollowTargetType.User,
          targetId: blockedUserId,
        }).catch(() => {
          // Ignore error if follow relationship doesn't exist
        });

        // Remove: blockedUser following userId
        await FollowDAO.remove({
          followerUserId: blockedUserId,
          targetType: FollowTargetType.User,
          targetId: userId,
        }).catch(() => {
          // Ignore error if follow relationship doesn't exist
        });

        logger.debug(`[UserService.blockUser] Follow relationships cleaned up for block ${userId} -> ${blockedUserId}`);
      } catch (error) {
        logger.error(`[UserService.blockUser] Error cleaning up follow relationships:`, { error });
      }
    };

    // Run follow cleanup asynchronously (don't block the main operation)
    removeFollows();

    // Add to blocked list
    return UserDAO.blockUser(userId, blockedUserId);
  }

  /**
   * Unblock a user
   * - Removes user from blocked list
   * - Does NOT restore follow relationships
   */
  static async unblockUser(userId: string, blockedUserId: string): Promise<User> {
    logger.debug(`[UserService.unblockUser] User ${userId} unblocking ${blockedUserId}`);
    return UserDAO.unblockUser(userId, blockedUserId);
  }

  /**
   * Mute a user
   * - Hides their content from feed
   * - Does NOT affect follow relationships
   */
  static async muteUser(userId: string, mutedUserId: string): Promise<User> {
    logger.debug(`[UserService.muteUser] User ${userId} muting ${mutedUserId}`);
    return UserDAO.muteUser(userId, mutedUserId);
  }

  /**
   * Unmute a user
   * - Shows their content in feed again
   */
  static async unmuteUser(userId: string, mutedUserId: string): Promise<User> {
    logger.debug(`[UserService.unmuteUser] User ${userId} unmuting ${mutedUserId}`);
    return UserDAO.unmuteUser(userId, mutedUserId);
  }

  /**
   * Mute an organization
   * - Hides their content from feed
   */
  static async muteOrganization(userId: string, organizationId: string): Promise<User> {
    logger.debug(`[UserService.muteOrganization] User ${userId} muting org ${organizationId}`);
    return UserDAO.muteOrganization(userId, organizationId);
  }

  /**
   * Unmute an organization
   * - Shows their content in feed again
   */
  static async unmuteOrganization(userId: string, organizationId: string): Promise<User> {
    logger.debug(`[UserService.unmuteOrganization] User ${userId} unmuting org ${organizationId}`);
    return UserDAO.unmuteOrganization(userId, organizationId);
  }
}

export default UserService;
