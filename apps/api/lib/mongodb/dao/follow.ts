import {GraphQLError} from 'graphql';
import type {UpdateQuery} from 'mongoose';
import {Types} from 'mongoose';
import type {Follow as FollowEntity, CreateFollowInput, FollowTargetType} from '@ntlango/commons/types';
import {Follow as FollowModel} from '@/mongodb/models';
import {CustomError, ErrorTypes, KnownCommonError} from '@/utils';

class FollowDAO {
  static async upsert(input: CreateFollowInput & {followerUserId: string}): Promise<FollowEntity> {
    try {
      const {followerUserId, targetType, targetId, status} = input;
      const update: UpdateQuery<FollowEntity> = {
        $set: {
          targetType,
          targetId,
        },
        $setOnInsert: {
          followId: new Types.ObjectId().toString(),
          createdAt: new Date(),
        },
      };
      if (status !== undefined) {
        (update.$set as Partial<FollowEntity>).status = status;
      }
      const follow = await FollowModel.findOneAndUpdate(
        {followerUserId, targetType, targetId},
        update,
        {new: true, upsert: true, setDefaultsOnInsert: true},
      ).exec();

      if (!follow) {
        throw CustomError('Unable to upsert follow', ErrorTypes.INTERNAL_SERVER_ERROR);
      }

      return follow.toObject();
    } catch (error) {
      console.error('Error upserting follow', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readFollowingForUser(followerUserId: string): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({followerUserId}).sort({createdAt: -1}).exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      console.error('Error reading following list', error);
      throw KnownCommonError(error);
    }
  }

  static async readFollowers(targetType: FollowTargetType, targetId: string): Promise<FollowEntity[]> {
    try {
      const follows = await FollowModel.find({targetType, targetId}).sort({createdAt: -1}).exec();
      return follows.map((f) => f.toObject());
    } catch (error) {
      console.error('Error reading followers', error);
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
      console.error('Error removing follow', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default FollowDAO;
