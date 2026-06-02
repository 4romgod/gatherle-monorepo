import DataLoader from 'dataloader';
import { FollowDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

/**
 * Creates a per-request DataLoader for batching EventSeries save-count lookups.
 * Collapses N individual Follow.countDocuments calls into a single aggregation
 * when resolving savedByCount across a list of events.
 */
export const createEventSaveCountLoader = () =>
  new DataLoader<string, number>(
    async (eventIds) => {
      const uniqueIds = Array.from(new Set(eventIds));
      logger.debug(`EventSaveCountLoader batching ${uniqueIds.length} event IDs`);

      const countMap = await FollowDAO.countSavesForEvents(uniqueIds);
      return eventIds.map((id) => countMap.get(id) ?? 0);
    },
    { cacheKeyFn: (key) => key },
  );
