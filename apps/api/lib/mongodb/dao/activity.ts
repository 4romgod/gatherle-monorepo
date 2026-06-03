import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ActivityObjectType, FollowApprovalStatus, FollowTargetType } from '@gatherle/commons/types';
import type { Activity as ActivityEntity, CreateActivityInput } from '@gatherle/commons/types';
import { Activity as ActivityModel, Follow as FollowModel } from '@/mongodb/models';
import { KnownCommonError, logDaoError } from '@/utils';

class ActivityDAO {
  static async create(input: CreateActivityInput & { actorId: string }): Promise<ActivityEntity> {
    try {
      const { actorId, verb, objectType, objectId, targetType, targetId, visibility, eventAt, metadata } = input;
      const activity = await ActivityModel.create({
        activityId: new Types.ObjectId().toString(),
        actorId,
        verb,
        objectType,
        objectId,
        targetType,
        targetId,
        visibility,
        eventAt,
        metadata,
      });
      return activity.toObject();
    } catch (error) {
      logDaoError('Error creating activity', { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readByActor(actorId: string, limit = 25): Promise<ActivityEntity[]> {
    try {
      const sanitizedLimit = Math.max(1, Math.min(limit, 100));
      const activities = await ActivityModel.find({ actorId })
        .sort({ eventAt: -1, createdAt: -1 })
        .limit(sanitizedLimit)
        .exec();
      return activities.map((activity) => activity.toObject());
    } catch (error) {
      logDaoError('Error reading activities by actor', { error });
      throw KnownCommonError(error);
    }
  }

  static async readByActorIds(actorIds: string[], limit = 25): Promise<ActivityEntity[]> {
    try {
      if (!actorIds.length) {
        return [];
      }
      const sanitizedLimit = Math.max(1, Math.min(limit, 100));
      const activities = await ActivityModel.find({ actorId: { $in: actorIds } })
        .sort({ eventAt: -1, createdAt: -1 })
        .limit(sanitizedLimit)
        .exec();
      return activities.map((activity) => activity.toObject());
    } catch (error) {
      logDaoError('Error reading feed activities', { error });
      throw KnownCommonError(error);
    }
  }

  static async readFeedForUser(userId: string, limit = 25): Promise<ActivityEntity[]> {
    try {
      const sanitizedLimit = Math.max(1, Math.min(limit, 100));
      const activities = await ActivityModel.aggregate<ActivityEntity>([
        { $match: { actorId: userId } },
        {
          $unionWith: {
            coll: FollowModel.collection.name,
            pipeline: [
              {
                $match: {
                  followerUserId: userId,
                  targetType: FollowTargetType.User,
                  approvalStatus: FollowApprovalStatus.Accepted,
                },
              },
              {
                $project: {
                  _id: 0,
                  actorId: '$targetId',
                },
              },
              {
                $lookup: {
                  from: ActivityModel.collection.name,
                  localField: 'actorId',
                  foreignField: 'actorId',
                  as: 'activities',
                },
              },
              { $unwind: '$activities' },
              { $replaceRoot: { newRoot: '$activities' } },
            ],
          },
        },
        { $sort: { eventAt: -1, createdAt: -1 } },
        { $limit: sanitizedLimit },
      ]).exec();

      return activities;
    } catch (error) {
      logDaoError('Error reading feed for user', { error, userId, limit });
      throw KnownCommonError(error);
    }
  }

  static async deleteByUserId(userId: string): Promise<void> {
    try {
      await ActivityModel.deleteMany({
        $or: [
          { actorId: userId },
          { objectType: ActivityObjectType.User, objectId: userId },
          { targetType: ActivityObjectType.User, targetId: userId },
        ],
      }).exec();
    } catch (error) {
      logDaoError('Error deleting activities for user', { error, userId });
      throw KnownCommonError(error);
    }
  }

  static async deleteByOrganizationId(orgId: string): Promise<void> {
    try {
      await ActivityModel.deleteMany({
        $or: [
          { objectType: ActivityObjectType.Organization, objectId: orgId },
          { targetType: ActivityObjectType.Organization, targetId: orgId },
        ],
      }).exec();
    } catch (error) {
      logDaoError('Error deleting activities for organization', { error, orgId });
      throw KnownCommonError(error);
    }
  }

  static async deleteByEventSeriesId(eventId: string): Promise<void> {
    try {
      await ActivityModel.deleteMany({
        $or: [
          { objectType: ActivityObjectType.EventSeries, objectId: eventId },
          { targetType: ActivityObjectType.EventSeries, targetId: eventId },
        ],
      }).exec();
    } catch (error) {
      logDaoError('Error deleting activities for event series', { error, eventId });
      throw KnownCommonError(error);
    }
  }
}

export default ActivityDAO;
