import DataLoader from 'dataloader';
import { EventSeriesParticipant as EventParticipantModel } from '@/mongodb/models';
import { EventSeriesParticipantDAO } from '@/mongodb/dao';
import type { EventSeriesParticipant } from '@gatherle/commons/types';
import { logger } from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching EventSeriesParticipant lookups by ID.
 * Eliminates N+1 queries when resolving nested event participant references.
 */
export const createEventSeriesParticipantLoader = () =>
  new DataLoader<string, EventSeriesParticipant | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`EventSeriesParticipantLoader batching ${uniqueKeys.length} participant IDs`);

      const participants = await EventParticipantModel.find({ _id: { $in: uniqueKeys } })
        .lean()
        .exec();

      const participantMap = new Map<string, EventSeriesParticipant>(
        participants.map((p) => [p._id.toString(), p as EventSeriesParticipant]),
      );

      // Return results in the same order as keys (required by DataLoader)
      return keys.map((key) => participantMap.get(key.toString()) ?? null);
    },
    {
      // Cache key function to handle ObjectId vs string comparisons
      cacheKeyFn: (key) => key.toString(),
    },
  );

/**
 * DataLoader for batching EventSeriesParticipant lookups by eventId.
 * Returns an array of participants for each eventId in the same order.
 */
export const createEventSeriesParticipantsByEventLoader = () =>
  new DataLoader<string, EventSeriesParticipant[]>(async (eventIds) => {
    const allParticipants = await EventSeriesParticipantDAO.readByEvents(eventIds as string[]);

    const map = new Map<string, EventSeriesParticipant[]>();
    for (const eventId of eventIds) map.set(eventId, []);
    for (const participant of allParticipants) {
      if (map.has(participant.eventId)) {
        map.get(participant.eventId)!.push(participant);
      }
    }
    return eventIds.map((id) => map.get(id) ?? []);
  });
