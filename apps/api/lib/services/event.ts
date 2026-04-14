import type { Event } from '@gatherle/commons/types';
import { EventDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

/**
 * Service for event domain logic.
 *
 * Acts as the orchestration layer between resolvers and the DAO.
 * Business logic that goes beyond a single DB operation belongs here,
 * not in the DAO.
 */
class EventService {
  /**
   * Return the top trending upcoming events, ranked by a composite score of
   * RSVP count + saved-by count, descending.
   * @param limit - Maximum number of events to return (default 10).
   */
  static async readTrending(limit: number = 10): Promise<Event[]> {
    logger.debug('[EventService] readTrending', { limit });
    return EventDAO.readTrending(limit);
  }
}

export default EventService;
