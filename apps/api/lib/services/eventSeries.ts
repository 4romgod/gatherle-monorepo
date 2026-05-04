import type {
  CreateEventInput,
  EventSchedule,
  EventSeries,
  EventOrganizer,
  SplitEventSeriesInput,
  UpdateEventInput,
} from '@gatherle/commons/types';
import {
  ActivityDAO,
  EventOccurrenceDAO,
  EventOccurrenceParticipantDAO,
  EventSeriesDAO,
  FollowDAO,
  NotificationDAO,
  UserFeedDAO,
} from '@/mongodb/dao';
import { CustomError, ErrorTypes, KnownCommonError, areEventSchedulesEqual } from '@/utils';
import { FollowTargetType, NotificationTargetType } from '@gatherle/commons/types';
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
  private static shouldDeleteFutureExceptionsOnScheduleChange(
    previousSchedule: EventSchedule,
    nextSchedule: EventSchedule,
  ): boolean {
    return (
      previousSchedule.startAt.getTime() !== nextSchedule.startAt.getTime() ||
      (previousSchedule.recurrenceRule ?? null) !== (nextSchedule.recurrenceRule ?? null)
    );
  }

  private static normalizeEventCategoryIds(eventSeries: EventSeries): string[] {
    return (eventSeries.eventCategories ?? []).map((category) => {
      if (typeof category === 'string') {
        return category;
      }

      if (category && typeof category === 'object' && '_id' in category && category._id) {
        return category._id.toString();
      }

      throw new Error('Unable to normalize event category reference.');
    });
  }

  private static normalizeOrganizerUserId(organizer: EventOrganizer): string {
    if (typeof organizer.user === 'string') {
      return organizer.user;
    }

    if ('_id' in organizer.user && organizer.user._id) {
      return organizer.user._id.toString();
    }

    if ('userId' in organizer.user && typeof organizer.user.userId === 'string') {
      return organizer.user.userId;
    }

    throw new Error('Unable to normalize event organizer user reference.');
  }

  private static normalizeOrganizers(eventSeries: EventSeries): Array<{ user: string; role: string }> {
    return (eventSeries.organizers ?? []).map((organizer: EventOrganizer) => ({
      user: this.normalizeOrganizerUserId(organizer),
      role: organizer.role,
    }));
  }

  private static async syncOccurrencesForSeries(
    eventSeries: Pick<EventSeries, 'eventId' | 'slug' | 'primarySchedule' | 'status' | 'scheduleVersion'>,
  ): Promise<void> {
    try {
      await EventOccurrenceService.syncEventSeriesOccurrences(eventSeries);
    } catch (error) {
      logger.error('[EventSeriesService] Failed to sync event occurrences', {
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

  private static async cleanupDeletedEventSideEffects(
    eventSeries: Pick<EventSeries, 'eventId' | 'slug'>,
  ): Promise<void> {
    let occurrenceIds: string[] = [];

    try {
      const occurrences = await EventOccurrenceDAO.readByEventSeriesId(eventSeries.eventId);
      occurrenceIds = occurrences.map((occurrence) => occurrence.occurrenceId);
    } catch (error) {
      logger.error('[EventSeriesService.cleanupDeletedEventSideEffects] Failed to load occurrence ids for cleanup', {
        eventSeriesId: eventSeries.eventId,
        error,
      });
    }

    const cleanupSteps: Array<[string, () => Promise<unknown>]> = [
      ['occurrences', () => this.deleteOccurrencesForSeries(eventSeries.eventId)],
      ['activities', () => ActivityDAO.deleteByEventSeriesId(eventSeries.eventId)],
      ['follows', () => FollowDAO.deleteByTarget(FollowTargetType.EventSeries, eventSeries.eventId)],
      ['feed items', () => UserFeedDAO.deleteByEventId(eventSeries.eventId)],
      [
        'series notifications',
        () => NotificationDAO.deleteByTargetReference(NotificationTargetType.EventSeries, eventSeries.slug),
      ],
    ];

    if (occurrenceIds.length > 0) {
      cleanupSteps.push(
        ['occurrence participants', () => EventOccurrenceParticipantDAO.deleteByOccurrenceIds(occurrenceIds)],
        ['occurrence notifications', () => NotificationDAO.deleteByOccurrenceIds(occurrenceIds)],
      );
    }

    const results = await Promise.allSettled(cleanupSteps.map(([, cleanup]) => cleanup()));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error('[EventSeriesService.cleanupDeletedEventSideEffects] Best-effort cleanup step failed', {
          eventSeriesId: eventSeries.eventId,
          cleanupStep: cleanupSteps[index][0],
          error: result.reason,
        });
      }
    });
  }

  static async create(input: CreateEventInput): Promise<EventSeries> {
    const createdEvent = await EventSeriesDAO.create(input);
    await this.syncOccurrencesForSeries(createdEvent);
    return createdEvent;
  }

  static async update(
    input: UpdateEventInput,
    existingEvent?: Pick<EventSeries, 'eventId' | 'primarySchedule' | 'status'>,
  ): Promise<EventSeries> {
    const currentEvent = existingEvent ?? (await EventSeriesDAO.readEventById(input.eventId));
    const didScheduleChange =
      input.primarySchedule !== undefined &&
      !areEventSchedulesEqual(currentEvent.primarySchedule, input.primarySchedule as EventSchedule);
    const didStatusChange = input.status !== undefined && input.status !== currentEvent.status;
    const shouldDeleteFutureExceptions =
      didScheduleChange &&
      this.shouldDeleteFutureExceptionsOnScheduleChange(
        currentEvent.primarySchedule,
        input.primarySchedule as EventSchedule,
      );
    const updatedEvent = await EventSeriesDAO.updateEvent(input);

    if (didScheduleChange || didStatusChange) {
      if (shouldDeleteFutureExceptions) {
        await EventOccurrenceService.deleteFutureExceptionOccurrences(updatedEvent.eventId, new Date());
      }
      await this.syncOccurrencesForSeries(updatedEvent);
    }

    return updatedEvent;
  }

  static async deleteById(eventId: string): Promise<EventSeries> {
    const deletedEvent = await EventSeriesDAO.deleteEventById(eventId);
    await this.cleanupDeletedEventSideEffects(deletedEvent);
    return deletedEvent;
  }

  static async deleteBySlug(slug: string): Promise<EventSeries> {
    const deletedEvent = await EventSeriesDAO.deleteEventBySlug(slug);
    await this.cleanupDeletedEventSideEffects(deletedEvent);
    return deletedEvent;
  }

  static async splitAtOccurrence(input: SplitEventSeriesInput): Promise<EventSeries> {
    const { occurrence, eventSeries } = await EventOccurrenceService.readRecurringOccurrenceContext(input.occurrenceId);
    if (occurrence.isException) {
      throw CustomError(
        'Splitting from an already-exception occurrence is not supported in this phase.',
        ErrorTypes.BAD_REQUEST,
      );
    }

    const { predecessorRule, successorRule } = EventOccurrenceService.splitRecurringRuleAtOccurrence(
      eventSeries.primarySchedule.recurrenceRule,
      occurrence.originalStartAt,
    );

    const successorInput: CreateEventInput = {
      title: input.title ?? eventSeries.title,
      description: input.description ?? eventSeries.description,
      summary: input.summary ?? eventSeries.summary,
      primarySchedule: {
        ...eventSeries.primarySchedule,
        startAt: new Date(occurrence.startAt),
        endAt: occurrence.endAt ? new Date(occurrence.endAt) : undefined,
        timezone: occurrence.timezone,
        recurrenceRule: successorRule,
      },
      location: input.location ?? eventSeries.location,
      locationSnapshot: input.locationSnapshot ?? eventSeries.locationSnapshot,
      venueId: input.venueId ?? eventSeries.venueId,
      status: input.status ?? eventSeries.status,
      visibility: input.visibility ?? eventSeries.visibility,
      capacity: input.capacity ?? eventSeries.capacity,
      rsvpLimit: input.rsvpLimit ?? eventSeries.rsvpLimit,
      waitlistEnabled: input.waitlistEnabled ?? eventSeries.waitlistEnabled,
      allowGuestPlusOnes: input.allowGuestPlusOnes ?? eventSeries.allowGuestPlusOnes,
      remindersEnabled: input.remindersEnabled ?? eventSeries.remindersEnabled,
      showAttendees: input.showAttendees ?? eventSeries.showAttendees,
      eventCategories: input.eventCategories ?? this.normalizeEventCategoryIds(eventSeries),
      organizers: input.organizers ?? this.normalizeOrganizers(eventSeries),
      tags: input.tags ?? eventSeries.tags,
      media: input.media ?? eventSeries.media,
      additionalDetails: input.additionalDetails ?? eventSeries.additionalDetails,
      comments: input.comments ?? eventSeries.comments,
      privacySetting: input.privacySetting ?? eventSeries.privacySetting,
      eventLink: input.eventLink ?? eventSeries.eventLink,
      lifecycleStatus: eventSeries.lifecycleStatus,
      orgId: eventSeries.orgId,
    };

    const preferredSuccessorSlugBase = `${eventSeries.slug}-from-${occurrence.originalStartAt.toISOString().slice(0, 10)}`;

    const successorEvent = await EventSeriesDAO.createSplitSuccessor(
      successorInput,
      preferredSuccessorSlugBase,
      eventSeries.eventId,
    );

    const updatedSourceEvent = await EventSeriesDAO.applySeriesSplit(
      eventSeries.eventId,
      predecessorRule,
      successorEvent.eventId,
    );

    await EventOccurrenceService.moveFutureOccurrencesToSeries(
      eventSeries.eventId,
      successorEvent.eventId,
      successorEvent.slug,
      occurrence.originalStartAt,
      successorEvent.scheduleVersion ?? 1,
    );

    await Promise.all([
      this.syncOccurrencesForSeries(updatedSourceEvent),
      this.syncOccurrencesForSeries(successorEvent),
    ]);

    return successorEvent;
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
