import DataLoader from 'dataloader';
import { UserDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching EventCategory interest count lookups.
 * Eliminates N+1 countDocuments calls when resolving interestedUsersCount across category lists.
 */
export const createEventCategoryInterestCountLoader = () =>
  new DataLoader<string, number>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`EventCategoryInterestCountLoader batching ${uniqueKeys.length} category IDs`);

      const countMap = await UserDAO.countByInterestCategoryIds(uniqueKeys);
      return keys.map((key) => countMap.get(key.toString()) ?? 0);
    },
    {
      cacheKeyFn: (key) => key.toString(),
    },
  );
