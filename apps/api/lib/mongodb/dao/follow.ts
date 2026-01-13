import {GraphQLError} from 'graphql';
import type {UpdateQuery} from 'mongoose';
import {Types} from 'mongoose';
import type {
  Follow as FollowEntity,
  CreateFollowInput,
  FollowTargetType,
  FollowNotificationPreferences,
} from '@ntlango/commons/types';
import {FollowApprovalStatus} from '@ntlango/commons/types';
import {Follow as FollowModel} from '@/mongodb/models';
import {CustomError, ErrorTypes, KnownCommonError} from '@/utils';
import {logger} from '@/utils/logger';

class FollowDAO {
  static async upsert(input: CreateFollowInput & {followerUserId: string; approvalStatus?: FollowApprovalStatus}): Promise<FollowEntity> {
    try {
      const {followerUserId, targetType, targetId, notificationPreferences, approvalStatus} = input;
      
      let follow = await FollowModel.findOne({followerUserId, targetType, targetId}).exec();
      
      if (follow) {
        // Update existing follow
        follow.targetType = targetType;
        follow.targetId = targetId;
        if (notificationPreferences?.contentVisibility !== undefined) {
          follow.notificationPreferences = follow.notificationPreferences || {};
          follow.notificationPreferences.contentVisibility = notificationPreferences.contentVisibility;
        }
        await follow.save();
      } else {
        // Create new follow - triggers pre-validation hooks
        follow = await FollowModel.create({
          followerUserId,
          targetType,
          targetId,
          notificationPreferences,
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

  static async updateNotificationPreferences(
    followId: string,
    userId: string,
    notificationPreferences: Partial<FollowNotificationPreferences>,
  ): Promise<FollowEntity> {
    try {
      const follow = await FollowModel.findOne({followId, followerUserId: userId}).exec();

      if (!follow) {
        throw CustomError('Follow not found or user not authorized', ErrorTypes.NOT_FOUND);
      }
      
      if (notificationPreferences.contentVisibility !== undefined) {
        follow.notificationPreferences = follow.notificationPreferences || {};
        follow.notificationPreferences.contentVisibility = notificationPreferences.contentVisibility;
      }
      
      await follow.save();

      return follow.toObject();
    } catch (error) {
      logger.error('Error updating notification preferences', error);
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
      const follows = await FollowModel.find({targetType, targetId}).sort({createdAt: -1}).exec();
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
}

export default FollowDAO;
