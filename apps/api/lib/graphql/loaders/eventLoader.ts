import DataLoader from 'dataloader';
import { Event as EventModel } from '@/mongodb/models';
import type { Event } from '@gatherle/commons/types';
import { logger } from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching Event lookups by ID.
 * Eliminates N+1 queries when resolving nested event references (activities, etc.).
 */
export const createEventLoader = () =>
  new DataLoader<string, Event | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`EventLoader batching ${uniqueKeys.length} event IDs`);

      const events = await EventModel.find({ _id: { $in: uniqueKeys } })
        .lean()
        .exec();

      const eventMap = new Map<string, Event>(events.map((e) => [e._id.toString(), e as Event]));

      // Return results in the same order as keys (required by DataLoader)
      return keys.map((key) => eventMap.get(key.toString()) ?? null);
    },
    {
      // Cache key function to handle ObjectId vs string comparisons
      cacheKeyFn: (key) => key.toString(),
    },
  );
