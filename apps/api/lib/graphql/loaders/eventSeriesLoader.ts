import DataLoader from 'dataloader';
import { EventSeries as EventSeriesModel } from '@/mongodb/models';
import type { EventSeries } from '@gatherle/commons/types';
import { logger } from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching EventSeries lookups by ID.
 * Eliminates N+1 queries when resolving nested event references (activities, etc.).
 */
export const createEventSeriesLoader = () =>
  new DataLoader<string, EventSeries | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`EventSeriesLoader batching ${uniqueKeys.length} event IDs`);

      const events = await EventSeriesModel.find({ _id: { $in: uniqueKeys } })
        .lean()
        .exec();

      const eventMap = new Map<string, EventSeries>(events.map((e) => [e._id.toString(), e as EventSeries]));

      // Return results in the same order as keys (required by DataLoader)
      return keys.map((key) => eventMap.get(key.toString()) ?? null);
    },
    {
      // Cache key function to handle ObjectId vs string comparisons
      cacheKeyFn: (key) => key.toString(),
    },
  );
