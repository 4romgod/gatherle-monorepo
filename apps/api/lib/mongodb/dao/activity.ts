import {GraphQLError} from 'graphql';
import {Types} from 'mongoose';
import type {Activity as ActivityEntity, CreateActivityInput} from '@ntlango/commons/types';
import {Activity as ActivityModel} from '@/mongodb/models';
import {CustomError, ErrorTypes, KnownCommonError} from '@/utils';

class ActivityDAO {
  static async create(input: CreateActivityInput & {actorId: string}): Promise<ActivityEntity> {
    try {
      const {actorId, verb, objectType, objectId, targetType, targetId, visibility, eventAt, metadata} = input;
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
      console.error('Error creating activity', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readByActor(actorId: string, limit = 25): Promise<ActivityEntity[]> {
    try {
      const sanitizedLimit = Math.max(1, Math.min(limit, 100));
      const activities = await ActivityModel.find({actorId})
        .sort({eventAt: -1, createdAt: -1})
        .limit(sanitizedLimit)
        .exec();
      return activities.map((activity) => activity.toObject());
    } catch (error) {
      console.error('Error reading activities by actor', error);
      throw KnownCommonError(error);
    }
  }

  static async readByActorIds(actorIds: string[], limit = 25): Promise<ActivityEntity[]> {
    try {
      if (!actorIds.length) {
        return [];
      }
      const sanitizedLimit = Math.max(1, Math.min(limit, 100));
      const activities = await ActivityModel.find({actorId: {$in: actorIds}})
        .sort({eventAt: -1, createdAt: -1})
        .limit(sanitizedLimit)
        .exec();
      return activities.map((activity) => activity.toObject());
    } catch (error) {
      console.error('Error reading feed activities', error);
      throw KnownCommonError(error);
    }
  }
}

export default ActivityDAO;
