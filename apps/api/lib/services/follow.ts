import type { Follow, CreateFollowInput } from '@ntlango/commons/types';
import {
  FollowTargetType,
  FollowApprovalStatus,
  FollowPolicy,
  NotificationType,
  NotificationTargetType,
} from '@ntlango/commons/types';
import { FollowDAO, UserDAO, OrganizationDAO, EventDAO } from '@/mongodb/dao';
import { CustomError, ErrorTypes } from '@/utils';
import { logger } from '@/utils/logger';
import NotificationService from './notification';

export interface FollowParams extends CreateFollowInput {
  followerUserId: string;
}

export interface UnfollowParams {
  followerUserId: string;
  targetType: FollowTargetType;
  targetId: string;
}

/**
 * Service for managing follow relationships with notification integration
 */
class FollowService {
  /**
   * Follow a user, organization, or event (save)
   * Sends appropriate notifications based on follow type and approval status
   */
  static async follow(params: FollowParams): Promise<Follow> {
    const { followerUserId, targetType, targetId, ...rest } = params;

    let approvalStatus = FollowApprovalStatus.Pending;

    if (targetType === FollowTargetType.User) {
      const targetUser = await UserDAO.readUserById(targetId);

      // Check if the target user has blocked the follower
      if (targetUser.blockedUserIds?.includes(followerUserId)) {
        throw CustomError('You cannot follow this user', ErrorTypes.UNAUTHORIZED);
      }

      // Check if the follower has blocked the target user
      const followerUser = await UserDAO.readUserById(followerUserId);
      if (followerUser.blockedUserIds?.includes(targetId)) {
        throw CustomError('You cannot follow a blocked user', ErrorTypes.UNAUTHORIZED);
      }

      approvalStatus =
        (targetUser.followPolicy ?? FollowPolicy.Public) === FollowPolicy.Public
          ? FollowApprovalStatus.Accepted
          : FollowApprovalStatus.Pending;
    } else if (targetType === FollowTargetType.Organization) {
      const targetOrg = await OrganizationDAO.readOrganizationById(targetId);
      approvalStatus =
        (targetOrg.followPolicy ?? FollowPolicy.Public) === FollowPolicy.Public
          ? FollowApprovalStatus.Accepted
          : FollowApprovalStatus.Pending;
    } else if (targetType === FollowTargetType.Event) {
      await EventDAO.readEventById(targetId);
      // Events are always publicly saveable - no approval needed
      approvalStatus = FollowApprovalStatus.Accepted;
    }

    const follow = await FollowDAO.upsert({
      ...rest,
      targetType,
      targetId,
      followerUserId,
      approvalStatus,
    });

    // Send notifications asynchronously (don't block the response)
    this.sendFollowNotification(follow, followerUserId).catch((err) => {
      logger.error('Failed to send follow notification', err);
    });

    return follow;
  }

  /**
   * Unfollow a user, organization, or unsave an event
   */
  static async unfollow(params: UnfollowParams): Promise<boolean> {
    const { followerUserId, targetType, targetId } = params;
    return FollowDAO.remove({ followerUserId, targetType, targetId });
  }

  /**
   * Accept a follow request
   * Sends FOLLOW_ACCEPTED notification to the requester
   */
  static async acceptFollowRequest(followId: string, targetUserId: string): Promise<Follow> {
    const follow = await FollowDAO.updateApprovalStatus(followId, targetUserId, FollowApprovalStatus.Accepted);

    // Notify the follower that their request was accepted
    NotificationService.notify({
      type: NotificationType.FOLLOW_ACCEPTED,
      recipientUserId: follow.followerUserId,
      actorUserId: targetUserId,
      targetType: NotificationTargetType.User,
      // No targetSlug needed - social notifications use actorUsername for URL
    }).catch((err) => {
      logger.error('Failed to send follow accepted notification', err);
    });

    return follow;
  }

  /**
   * Reject a follow request
   * No notification sent for rejections (by design - avoid negative notifications)
   */
  static async rejectFollowRequest(followId: string, targetUserId: string): Promise<boolean> {
    await FollowDAO.updateApprovalStatus(followId, targetUserId, FollowApprovalStatus.Rejected);
    return true;
  }

  /**
   * Remove a follower (as the target user/org)
   */
  static async removeFollower(
    targetUserId: string,
    followerUserId: string,
    targetType: FollowTargetType,
  ): Promise<boolean> {
    return FollowDAO.removeFollower(targetUserId, followerUserId, targetType);
  }

  /**
   * Send the appropriate notification for a follow action
   */
  private static async sendFollowNotification(follow: Follow, actorUserId: string): Promise<void> {
    // Only send notifications for user follows (not org follows or event saves)
    if (follow.targetType !== FollowTargetType.User) {
      return;
    }

    // Don't notify yourself
    if (follow.targetId === actorUserId) {
      return;
    }

    if (follow.approvalStatus === FollowApprovalStatus.Accepted) {
      // Immediate follow (public profile) - send FOLLOW_RECEIVED
      await NotificationService.notify({
        type: NotificationType.FOLLOW_RECEIVED,
        recipientUserId: follow.targetId,
        actorUserId,
        targetType: NotificationTargetType.User,
        // No targetSlug needed - social notifications use actorUsername for URL
      });
    } else if (follow.approvalStatus === FollowApprovalStatus.Pending) {
      // Follow request (private profile) - send FOLLOW_REQUEST
      await NotificationService.notify({
        type: NotificationType.FOLLOW_REQUEST,
        recipientUserId: follow.targetId,
        actorUserId,
        targetType: NotificationTargetType.User,
        // No targetSlug needed - social notifications use actorUsername for URL
      });
    }
  }
}

export default FollowService;
