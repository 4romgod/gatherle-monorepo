import type { Follow as FollowEntity, CreateFollowInput } from '@gatherle/commons/types';
import { FollowApprovalStatus, FollowTargetType } from '@gatherle/commons/types';
import { Follow as FollowModel } from '@/mongodb/models';
import { CustomError, ErrorTypes, KnownCommonError } from '@/utils';
import { logger } from '@/utils/logger';

class FollowDAO {
  static async upsert(
    input: CreateFollowInput & { followerUserId: string; approvalStatus?: FollowApprovalStatus },
  ): Promise<FollowEntity> {
    try {
      const { followerUserId, targetType, targetId, approvalStatus } = input;

      let follow = await FollowModel.findOne({ followerUserId, targetType, targetId }).exec();

      if (follow) {
        // Update existing follow (e.g., re-following after rejection)
        follow.targetType = targetType;
        follow.targetId = targetId;
        if (approvalStatus !== undefined) {
          follow.approvalStatus = approvalStatus;
        }
        await follow.save();
      } else {
        // Create new follow - triggers pre-validation hooks
        follow = await FollowModel.create({
          followerUserId,
          targetType,
          targetId,
          approvalStatus: approvalStatus ?? FollowApprovalStatus.Pending,
        });
      }

      return follow.toObject();
    } catch (error) {
      logger.error('Error upserting follow', { error });
      throw KnownCommonError(error);
    }
  }

  static async updateApprovalStatus(
    followId: string,
    targetUserId: string,
    approvalStatus: FollowApprovalStatus,
  ): Promise<FollowEntity> {
    let follow;
    try {
      follow = await FollowModel.findOne({ followId }).exec();
    } catch (error) {
      logger.error('Error finding follow for approval status update', { error });
      throw KnownCommonError(error);
    }

    if (!follow) {
      throw CustomError('Follow request not found', ErrorTypes.NOT_FOUND);
    }

    if (follow.targetId !== targetUserId) {
      throw CustomError('Not authorized to modify this follow request', ErrorTypes.UNAUTHORIZED);
    }

    try {
      follow.approvalStatus = approvalStatus;
      await follow.save();
      return follow.toObject();
    } catch (error) {
      logger.error('Error updating approval status', { error });
      throw KnownCommonError(error);
    }
  }

  static async readPendingFollows(targetUserId: string, targetType: FollowTargetType): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({
        targetId: targetUserId,
        targetType,
        approvalStatus: FollowApprovalStatus.Pending,
      })
        .sort({ createdAt: -1 })
        .exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading pending follows', { error });
      throw KnownCommonError(error);
    }
  }

  static async readFollowRequests(targetUserId: string, targetType: FollowTargetType): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({
        targetId: targetUserId,
        targetType,
      })
        .sort({ updatedAt: -1 })
        .exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading follow requests', { error });
      throw KnownCommonError(error);
    }
  }

  static async readFollowingForUser(followerUserId: string): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({ followerUserId }).sort({ createdAt: -1 }).exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading following list', { error });
      throw KnownCommonError(error);
    }
  }

  static async readFollowers(targetType: FollowTargetType, targetId: string): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({
        targetType,
        targetId,
        approvalStatus: FollowApprovalStatus.Accepted,
      })
        .sort({ createdAt: -1 })
        .exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading followers', { error });
      throw KnownCommonError(error);
    }
  }

  static async countFollowers(targetType: FollowTargetType, targetId: string): Promise<number> {
    try {
      return await FollowModel.countDocuments({
        targetType,
        targetId,
        approvalStatus: FollowApprovalStatus.Accepted,
      }).exec();
    } catch (error) {
      logger.error('Error counting followers', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Check if a user follows a specific target.
   * More efficient than loading all follows when checking a single relationship.
   */
  static async isFollowing(followerUserId: string, targetType: FollowTargetType, targetId: string): Promise<boolean> {
    try {
      const follow = await FollowModel.findOne({
        followerUserId,
        targetType,
        targetId,
        approvalStatus: FollowApprovalStatus.Accepted,
      }).exec();
      return follow !== null;
    } catch (error) {
      logger.error('Error checking follow status', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Unfollow a target (user or organization).
   * Called by the follower when they want to stop following someone.
   * Removes the follow edge regardless of approval status.
   * @param params.followerUserId - The user who is unfollowing
   * @param params.targetType - The type of entity being unfollowed (User or Organization)
   * @param params.targetId - The ID of the entity being unfollowed
   * @returns true if the follow was removed
   * @throws NOT_FOUND if no follow edge exists
   */
  static async remove(params: {
    followerUserId: string;
    targetType: FollowTargetType;
    targetId: string;
  }): Promise<boolean> {
    let removed;
    try {
      removed = await FollowModel.findOneAndDelete(params).exec();
    } catch (error) {
      logger.error('Error removing follow', { error });
      throw KnownCommonError(error);
    }
    if (!removed) {
      throw CustomError('Follow edge not found', ErrorTypes.NOT_FOUND);
    }
    return true;
  }

  /**
   * Remove a follower from your followers list.
   * Called by the target user when they want to remove someone who follows them.
   * Only removes accepted follows (not pending requests).
   * @param targetUserId - The user who is removing the follower (the one being followed)
   * @param followerUserId - The follower to remove
   * @param targetType - The type of target (User or Organization)
   * @returns true if the follower was removed
   * @throws NOT_FOUND if no accepted follow exists
   */
  static async removeFollower(
    targetUserId: string,
    followerUserId: string,
    targetType: FollowTargetType,
  ): Promise<boolean> {
    let removed;
    try {
      removed = await FollowModel.findOneAndDelete({
        followerUserId,
        targetType,
        targetId: targetUserId,
        approvalStatus: FollowApprovalStatus.Accepted,
      }).exec();
    } catch (error) {
      logger.error('Error removing follower', { error });
      throw KnownCommonError(error);
    }

    if (!removed) {
      throw CustomError('Follower not found or not authorized', ErrorTypes.NOT_FOUND);
    }

    return true;
  }

  // ============================================================================
  // SAVED EVENTS METHODS (Event as targetType)
  // ============================================================================

  /**
   * Get all saved events for a user.
   * @param userId - The user who saved the events
   * @returns Array of Follow entities where targetType is Event
   */
  static async readSavedEventsForUser(userId: string): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({
        followerUserId: userId,
        targetType: FollowTargetType.Event,
        approvalStatus: FollowApprovalStatus.Accepted,
      })
        .sort({ createdAt: -1 })
        .exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading saved events for user', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Count how many users have saved a specific event.
   * @param eventId - The event to count saves for
   * @returns Number of users who saved this event
   */
  static async countSavesForEvent(eventId: string): Promise<number> {
    try {
      return await FollowModel.countDocuments({
        targetType: FollowTargetType.Event,
        targetId: eventId,
        approvalStatus: FollowApprovalStatus.Accepted,
      }).exec();
    } catch (error) {
      logger.error('Error counting saves for event', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Check if a user has saved a specific event.
   * @param eventId - The event to check
   * @param userId - The user to check
   * @returns true if the user has saved the event
   */
  static async isEventSavedByUser(eventId: string, userId: string): Promise<boolean> {
    try {
      const follow = await FollowModel.findOne({
        followerUserId: userId,
        targetType: FollowTargetType.Event,
        targetId: eventId,
        approvalStatus: FollowApprovalStatus.Accepted,
      }).exec();
      return follow !== null;
    } catch (error) {
      logger.error('Error checking if event is saved', { error });
      throw KnownCommonError(error);
    }
  }
}

export default FollowDAO;
