import {GraphQLError} from 'graphql';
import type {
  Follow as FollowEntity,
  CreateFollowInput,
  FollowTargetType,
} from '@ntlango/commons/types';
import {FollowApprovalStatus} from '@ntlango/commons/types';
import {Follow as FollowModel} from '@/mongodb/models';
import {CustomError, ErrorTypes, KnownCommonError} from '@/utils';
import {logger} from '@/utils/logger';

class FollowDAO {
  static async upsert(input: CreateFollowInput & {followerUserId: string; approvalStatus?: FollowApprovalStatus}): Promise<FollowEntity> {
    try {
      const {followerUserId, targetType, targetId, approvalStatus} = input;
      
      let follow = await FollowModel.findOne({followerUserId, targetType, targetId}).exec();
      
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
      logger.error('Error upserting follow', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async updateApprovalStatus(followId: string, targetUserId: string, approvalStatus: FollowApprovalStatus): Promise<FollowEntity> {
    try {
      const follow = await FollowModel.findOne({followId}).exec();

      if (!follow) {
        throw CustomError('Follow request not found', ErrorTypes.NOT_FOUND);
      }

      if (follow.targetId !== targetUserId) {
        throw CustomError('Not authorized to modify this follow request', ErrorTypes.UNAUTHORIZED);
      }

      follow.approvalStatus = approvalStatus;
      await follow.save();

      return follow.toObject();
    } catch (error) {
      logger.error('Error updating approval status', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
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
        .sort({createdAt: -1})
        .exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading pending follows', error);
      throw KnownCommonError(error);
    }
  }

  static async readFollowRequests(targetUserId: string, targetType: FollowTargetType): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({
        targetId: targetUserId,
        targetType,
      })
        .sort({updatedAt: -1})
        .exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading follow requests', error);
      throw KnownCommonError(error);
    }
  }

  static async readFollowingForUser(followerUserId: string): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({followerUserId}).sort({createdAt: -1}).exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading following list', error);
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
        .sort({createdAt: -1})
        .exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      logger.error('Error reading followers', error);
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
      logger.error('Error counting followers', error);
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
  static async remove(params: {followerUserId: string; targetType: FollowTargetType; targetId: string}): Promise<boolean> {
    try {
      const removed = await FollowModel.findOneAndDelete(params).exec();
      if (!removed) {
        throw CustomError('Follow edge not found', ErrorTypes.NOT_FOUND);
      }
      return true;
    } catch (error) {
      logger.error('Error removing follow', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
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
  static async removeFollower(targetUserId: string, followerUserId: string, targetType: FollowTargetType): Promise<boolean> {
    try {
      const removed = await FollowModel.findOneAndDelete({
        followerUserId,
        targetType,
        targetId: targetUserId,
        approvalStatus: FollowApprovalStatus.Accepted,
      }).exec();
      
      if (!removed) {
        throw CustomError('Follower not found or not authorized', ErrorTypes.NOT_FOUND);
      }
      
      return true;
    } catch (error) {
      logger.error('Error removing follower', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default FollowDAO;
