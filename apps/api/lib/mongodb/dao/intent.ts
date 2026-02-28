import { GraphQLError } from 'graphql';
import type { Intent as IntentEntity, UpsertIntentInput } from '@gatherle/commons/types';
import { Intent as IntentModel } from '@/mongodb/models';
import { KnownCommonError , logDaoError } from '@/utils';

class IntentDAO {
  static async upsert(input: UpsertIntentInput & { userId: string }): Promise<IntentEntity> {
    try {
      const { userId, eventId, intentId, status, visibility, source, participantId, metadata } = input;
      const filter = intentId ? { intentId } : { userId, eventId };

      let intent = await IntentModel.findOne(filter).exec();

      if (intent) {
        if (status !== undefined) intent.status = status;
        if (visibility !== undefined) intent.visibility = visibility;
        if (source !== undefined) intent.source = source;
        if (participantId !== undefined) intent.participantId = participantId;
        if (metadata !== undefined) intent.metadata = metadata;
        await intent.save();
      } else {
        intent = await IntentModel.create({
          userId,
          eventId,
          status,
          visibility,
          source,
          participantId,
          metadata,
        });
      }

      return intent.toObject();
    } catch (error) {
      logDaoError('Error upserting intent', { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readByUser(userId: string): Promise<IntentEntity[]> {
    try {
      const intents = await IntentModel.find({ userId }).sort({ updatedAt: -1 }).exec();
      return intents.map((intent) => intent.toObject());
    } catch (error) {
      logDaoError('Error reading user intents', { error });
      throw KnownCommonError(error);
    }
  }

  static async readByEvent(eventId: string): Promise<IntentEntity[]> {
    try {
      const intents = await IntentModel.find({ eventId }).sort({ updatedAt: -1 }).exec();
      return intents.map((intent) => intent.toObject());
    } catch (error) {
      logDaoError('Error reading event intents', { error });
      throw KnownCommonError(error);
    }
  }
}

export default IntentDAO;
