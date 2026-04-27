import type { EventSeries } from '@gatherle/commons/types';
import { EventSeriesDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

/**
 * Service for event domain logic.
 *
 * Acts as the orchestration layer between resolvers and the DAO.
 * Business logic that goes beyond a single DB operation belongs here,
 * not in the DAO.
 */
class EventSeriesService {
  /**
   * Return the top trending upcoming events, ranked by a composite score of
   * RSVP count + saved-by count, descending.
   * @param limit - Maximum number of events to return (default 10).
   */
  static async readTrending(limit: number = 10): Promise<EventSeries[]> {
    logger.debug('[EventSeriesService] readTrending', { limit });
    return EventSeriesDAO.readTrending(limit);
  }
}

export default EventSeriesService;
