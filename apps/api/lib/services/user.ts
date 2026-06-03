import type { User, UserRole } from '@gatherle/commons/types';
import { FollowTargetType } from '@gatherle/commons/types';
import {
  ActivityDAO,
  EmailVerificationTokenDAO,
  EventOccurrenceParticipantDAO,
  FollowDAO,
  NotificationDAO,
  OrganizationMembershipDAO,
  PasswordResetTokenDAO,
  UserDAO,
  UserFeedDAO,
} from '@/mongodb/dao';
import AuditLogService from './auditLog';
import { logger } from '@/utils/logger';

/**
 * User service for operations with side effects
 *
 * Use this service (not UserDAO directly) when:
 * - Deleting users (requires cascading cleanup)
 * - Blocking/unblocking users (removes follow relationships)
 * - Any operation that affects multiple entities
 *
 * Use UserDAO directly for:
 * - Simple CRUD operations (create, read, update)
 * - Single-entity operations without side effects
 */
class UserService {
  private static async cleanupDeletedUserData(userId: string): Promise<void> {
    const cleanupSteps = [
      ['follow relationships', () => FollowDAO.deleteByUserId(userId)],
      ['organization memberships', () => OrganizationMembershipDAO.deleteByUserId(userId)],
      ['activities', () => ActivityDAO.deleteByUserId(userId)],
      ['notifications', () => NotificationDAO.deleteByUserId(userId)],
      ['feed items', () => UserFeedDAO.clearFeedForUser(userId)],
      ['occurrence participants', () => EventOccurrenceParticipantDAO.deleteByUserId(userId)],
      ['email verification tokens', () => EmailVerificationTokenDAO.deleteByUserId(userId)],
      ['password reset tokens', () => PasswordResetTokenDAO.deleteByUserId(userId)],
    ] as const;

    const results = await Promise.allSettled(cleanupSteps.map(([, cleanup]) => cleanup()));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error('[UserService.cleanupDeletedUserData] Best-effort cleanup step failed', {
          userId,
          cleanupStep: cleanupSteps[index][0],
          error: result.reason,
        });
      }
    });
  }

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

  static async deleteById(userId: string, actorId?: string, actorRole?: UserRole, ipAddress?: string): Promise<User> {
    logger.debug(`[UserService.deleteById] Deleting user ${userId}`);
    const deletedUser = await UserDAO.deleteUserById(userId);
    await this.cleanupDeletedUserData(deletedUser.userId);
    if (actorId && actorRole) {
      AuditLogService.logUserDeleted({
        actorId,
        actorRole,
        targetUserId: deletedUser.userId,
        userSnapshot: { userId: deletedUser.userId, username: deletedUser.username, email: deletedUser.email },
        ipAddress,
      });
    }
    return deletedUser;
  }

  static async deleteByEmail(email: string, actorId?: string, actorRole?: UserRole, ipAddress?: string): Promise<User> {
    const deletedUser = await UserDAO.deleteUserByEmail(email);
    await this.cleanupDeletedUserData(deletedUser.userId);
    if (actorId && actorRole) {
      AuditLogService.logUserDeleted({
        actorId,
        actorRole,
        targetUserId: deletedUser.userId,
        userSnapshot: { userId: deletedUser.userId, username: deletedUser.username, email: deletedUser.email },
        ipAddress,
      });
    }
    return deletedUser;
  }

  static async deleteByUsername(
    username: string,
    actorId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<User> {
    const deletedUser = await UserDAO.deleteUserByUsername(username);
    await this.cleanupDeletedUserData(deletedUser.userId);
    if (actorId && actorRole) {
      AuditLogService.logUserDeleted({
        actorId,
        actorRole,
        targetUserId: deletedUser.userId,
        userSnapshot: { userId: deletedUser.userId, username: deletedUser.username, email: deletedUser.email },
        ipAddress,
      });
    }
    return deletedUser;
  }
}

export default UserService;
