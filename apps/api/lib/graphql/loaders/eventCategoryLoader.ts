import DataLoader from 'dataloader';
import {EventCategory as EventCategoryModel} from '@/mongodb/models';
import type {EventCategory} from '@ntlango/commons/types';
import {logger} from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching EventCategory lookups by ID.
 * Eliminates N+1 queries when resolving event categories across multiple events.
 */
export const createEventCategoryLoader = () =>
  new DataLoader<string, EventCategory | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`EventCategoryLoader batching ${uniqueKeys.length} category IDs`);

      const categories = await EventCategoryModel.find({_id: {$in: uniqueKeys}})
        .lean()
        .exec();

      const categoryMap = new Map<string, EventCategory>(categories.map((c) => [c._id.toString(), c as EventCategory]));

      // Return results in the same order as keys (required by DataLoader)
      return keys.map((key) => categoryMap.get(key.toString()) ?? null);
    },
    {
      // Cache key function to handle ObjectId vs string comparisons
      cacheKeyFn: (key) => key.toString(),
    },
  );
