import DataLoader from 'dataloader';
import { EventParticipant as EventParticipantModel } from '@/mongodb/models';
import { EventParticipantDAO } from '@/mongodb/dao';
import type { EventParticipant } from '@gatherle/commons/types';
import { logger } from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching EventParticipant lookups by ID.
 * Eliminates N+1 queries when resolving nested event participant references.
 */
export const createEventParticipantLoader = () =>
  new DataLoader<string, EventParticipant | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`EventParticipantLoader batching ${uniqueKeys.length} participant IDs`);

      const participants = await EventParticipantModel.find({ _id: { $in: uniqueKeys } })
        .lean()
        .exec();

      const participantMap = new Map<string, EventParticipant>(
        participants.map((p) => [p._id.toString(), p as EventParticipant]),
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
 * DataLoader for batching EventParticipant lookups by eventId.
 * Returns an array of participants for each eventId in the same order.
 */
export const createEventParticipantsByEventLoader = () =>
  new DataLoader<string, EventParticipant[]>(async (eventIds) => {
    const allParticipants = await EventParticipantDAO.readByEvents(eventIds as string[]);

    const map = new Map<string, EventParticipant[]>();
    for (const eventId of eventIds) map.set(eventId, []);
    for (const participant of allParticipants) {
      if (map.has(participant.eventId)) {
        map.get(participant.eventId)!.push(participant);
      }
    }
    return eventIds.map((id) => map.get(id) ?? []);
  });
