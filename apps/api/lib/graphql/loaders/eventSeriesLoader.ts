import DataLoader from 'dataloader';
import { FollowDAO } from '@/mongodb/dao';
import { EventSeries as EventSeriesModel } from '@/mongodb/models';
import type { EventSeries, UserRole } from '@gatherle/commons/server/types';
import { logger } from '@/utils/logger';
import EventSeriesService from '@/services/eventSeries';

/**
 * Creates a per-request DataLoader for batching EventSeries lookups by ID.
 * Eliminates N+1 queries when resolving nested event references (activities, etc.).
 */
export const createEventSeriesLoader = (userId?: string, userRole?: UserRole) =>
  new DataLoader<string, EventSeries | null>(
    async (keys) => {
      const uniqueKeys = Array.from(new Set(keys.map((k) => k.toString())));
      logger.debug(`EventSeriesLoader batching ${uniqueKeys.length} event IDs`);

      const [events, saveCounts, savedEventIds] = await Promise.all([
        EventSeriesModel.find({ _id: { $in: uniqueKeys } })
          .lean()
          .exec(),
        FollowDAO.countSavesForEvents(uniqueKeys),
        userId ? FollowDAO.readSavedEventIdsForUser(userId, uniqueKeys) : Promise.resolve(new Set<string>()),
      ]);

      const visibleEvents = await EventSeriesService.filterVisibleEvents(
        events as Array<EventSeries & { _id: { toString(): string } }>,
        userId,
        userRole,
      );

      const eventMap = new Map<string, EventSeries>(
        visibleEvents.map((event) => {
          const eventId = event.eventId?.toString?.() ?? event._id.toString();
          return [
            event._id.toString(),
            {
              ...(event as EventSeries),
              savedByCount: saveCounts.get(eventId) ?? 0,
              isSavedByMe: userId ? savedEventIds.has(eventId) : false,
            },
          ];
        }),
      );

      // Return results in the same order as keys (required by DataLoader)
      return keys.map((key) => eventMap.get(key.toString()) ?? null);
    },
    {
      // Cache key function to handle ObjectId vs string comparisons
      cacheKeyFn: (key) => key.toString(),
    },
  );
