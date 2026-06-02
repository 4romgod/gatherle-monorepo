import DataLoader from 'dataloader';
import { FollowDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching isSavedByMe lookups.
 * All keys in one tick are resolved with a single Follow.find by userId + $in eventIds.
 * Pass `undefined` for userId to get a loader that always returns false (unauthenticated requests).
 */
export const createEventSavedByMeLoader = (userId: string | undefined) =>
  new DataLoader<string, boolean>(
    async (eventIds) => {
      if (!userId) {
        return eventIds.map(() => false);
      }

      const uniqueIds = Array.from(new Set(eventIds));
      logger.debug(`EventSavedByMeLoader batching ${uniqueIds.length} event IDs for user ${userId}`);

      const savedSet = await FollowDAO.readSavedEventIdsForUser(userId, uniqueIds);
      return eventIds.map((id) => savedSet.has(id));
    },
    { cacheKeyFn: (key) => key },
  );
