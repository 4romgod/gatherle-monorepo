import {GraphQLError} from 'graphql';
import {Types} from 'mongoose';
import type {Intent as IntentEntity, UpsertIntentInput} from '@ntlango/commons/types';
import {Intent as IntentModel} from '@/mongodb/models';
import {CustomError, ErrorTypes, KnownCommonError} from '@/utils';

class IntentDAO {
  static async upsert(input: UpsertIntentInput & {userId: string}): Promise<IntentEntity> {
    try {
      const {userId, eventId, intentId, status, visibility, source, participantId, metadata} = input;
      const filter = intentId ? {intentId} : {userId, eventId};
      const update: Partial<IntentEntity> = {};

      if (status) update.status = status;
      if (visibility) update.visibility = visibility;
      if (source) update.source = source;
      if (participantId) update.participantId = participantId;
      if (metadata) update.metadata = metadata;

      const hasUpdates = Object.keys(update).length > 0;
      const updateQuery: any = {
        $setOnInsert: {
          intentId: intentId ?? new Types.ObjectId().toString(),
          userId,
          eventId,
        },
      };

      if (hasUpdates) {
        updateQuery.$set = {
          ...update,
        };
      }

      const intent = await IntentModel.findOneAndUpdate(filter, updateQuery, {new: true, upsert: true, setDefaultsOnInsert: true}).exec();

      if (!intent) {
        throw CustomError('Unable to persist intent', ErrorTypes.INTERNAL_SERVER_ERROR);
      }

      return intent.toObject();
    } catch (error) {
      console.error('Error upserting intent', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readByUser(userId: string): Promise<IntentEntity[]> {
    try {
      const intents = await IntentModel.find({userId}).sort({updatedAt: -1}).exec();
      return intents.map((intent) => intent.toObject());
    } catch (error) {
      console.error('Error reading user intents', error);
      throw KnownCommonError(error);
    }
  }

  static async readByEvent(eventId: string): Promise<IntentEntity[]> {
    try {
      const intents = await IntentModel.find({eventId}).sort({updatedAt: -1}).exec();
      return intents.map((intent) => intent.toObject());
    } catch (error) {
      console.error('Error reading event intents', error);
      throw KnownCommonError(error);
    }
  }
}

export default IntentDAO;
