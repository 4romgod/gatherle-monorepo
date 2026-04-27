import type { CreateEventInput, EventSeries, UpdateEventInput } from '@gatherle/commons/types';
import { EventSeriesDAO } from '@/mongodb/dao';
import { KnownCommonError } from '@/utils';
import { logger } from '@/utils/logger';
import EventOccurrenceService from './eventOccurrence';

/**
 * Service for event domain logic.
 *
 * Acts as the orchestration layer between resolvers and the DAO.
 * Business logic that goes beyond a single DB operation belongs here,
 * not in the DAO.
 */
class EventSeriesService {
  private static async syncOccurrencesForSeries(
    eventSeries: Pick<EventSeries, 'eventId' | 'primarySchedule' | 'status' | 'scheduleVersion'>,
  ): Promise<void> {
    try {
      await EventOccurrenceService.syncRecurringSeriesOccurrences(eventSeries);
    } catch (error) {
      logger.error('[EventSeriesService] Failed to sync recurring event occurrences', {
        eventSeriesId: eventSeries.eventId,
        error,
      });
      throw KnownCommonError(error);
    }
  }

  private static async deleteOccurrencesForSeries(eventSeriesId: string): Promise<void> {
    try {
      await EventOccurrenceService.deleteOccurrencesForSeries(eventSeriesId);
    } catch (error) {
      logger.error('[EventSeriesService] Failed to delete recurring event occurrences', {
        eventSeriesId,
        error,
      });
      throw KnownCommonError(error);
    }
  }

  static async create(input: CreateEventInput): Promise<EventSeries> {
    const createdEvent = await EventSeriesDAO.create(input);
    await this.syncOccurrencesForSeries(createdEvent);
    return createdEvent;
  }

  static async update(input: UpdateEventInput): Promise<EventSeries> {
    const updatedEvent = await EventSeriesDAO.updateEvent(input);

    if (input.primarySchedule !== undefined || input.status !== undefined) {
      await this.syncOccurrencesForSeries(updatedEvent);
    }

    return updatedEvent;
  }

  static async deleteById(eventId: string): Promise<EventSeries> {
    const deletedEvent = await EventSeriesDAO.deleteEventById(eventId);
    await this.deleteOccurrencesForSeries(deletedEvent.eventId);
    return deletedEvent;
  }

  static async deleteBySlug(slug: string): Promise<EventSeries> {
    const deletedEvent = await EventSeriesDAO.deleteEventBySlug(slug);
    await this.deleteOccurrencesForSeries(deletedEvent.eventId);
    return deletedEvent;
  }

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
