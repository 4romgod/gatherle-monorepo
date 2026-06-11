import type {
  CreateEventInput,
  EventsQueryOptionsInput,
  EventSchedule,
  EventSeries,
  EventOrganizer,
  PaginationInput,
  SplitEventSeriesInput,
  UpdateEventInput,
} from '@gatherle/commons/server/types';
import {
  ActivityDAO,
  EventOccurrenceDAO,
  EventOccurrenceParticipantDAO,
  EventSeriesDAO,
  FollowDAO,
  NotificationDAO,
  OrganizationMembershipDAO,
  UserFeedDAO,
} from '@/mongodb/dao';
import AuditLogService from './auditLog';
import { CustomError, ErrorTypes, KnownCommonError, areEventSchedulesEqual, getScheduleAnchorStartAt } from '@/utils';
import { EventVisibility, FollowTargetType, NotificationTargetType, UserRole } from '@gatherle/commons/server/types';
import { logger } from '@/utils/logger';
import EventOccurrenceService from './eventOccurrence';
import { sanitizeQueryLimit, validatePaginationInput } from '@/utils';

/**
 * Service for event domain logic.
 *
 * Acts as the orchestration layer between resolvers and the DAO.
 * Business logic that goes beyond a single DB operation belongs here,
 * not in the DAO.
 */
class EventSeriesService {
  private static readonly EVENT_VISIBILITY_BATCH_SIZE = 50;

  private static isPrivateEvent(eventSeries: Pick<EventSeries, 'visibility'>): boolean {
    return eventSeries.visibility === EventVisibility.Private;
  }

  private static isViewerOrganizer(eventSeries: Pick<EventSeries, 'organizers'>, viewerUserId?: string): boolean {
    if (!viewerUserId) {
      return false;
    }

    return (eventSeries.organizers ?? []).some((organizer) => {
      try {
        return this.normalizeOrganizerUserId(organizer) === viewerUserId;
      } catch {
        return false;
      }
    });
  }

  private static async buildViewerOrgMembershipSet(viewerUserId?: string): Promise<Set<string>> {
    if (!viewerUserId) {
      return new Set();
    }

    const memberships = await OrganizationMembershipDAO.readMembershipsByUserId(viewerUserId);
    return new Set(memberships.map((membership) => membership.orgId));
  }

  private static canViewerAccessEventWithMemberships(
    eventSeries: Pick<EventSeries, 'visibility' | 'orgId' | 'organizers'>,
    viewerOrgMemberships: Set<string>,
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): boolean {
    if (!this.isPrivateEvent(eventSeries)) {
      return true;
    }

    if (viewerUserRole === UserRole.Admin) {
      return true;
    }

    if (this.isViewerOrganizer(eventSeries, viewerUserId)) {
      return true;
    }

    if (!eventSeries.orgId) {
      return false;
    }

    return viewerOrgMemberships.has(eventSeries.orgId);
  }

  private static filterVisibleEventsWithMemberships<T extends Pick<EventSeries, 'visibility' | 'orgId' | 'organizers'>>(
    eventSeriesList: T[],
    viewerOrgMemberships: Set<string>,
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): T[] {
    if (viewerUserRole === UserRole.Admin) {
      return eventSeriesList;
    }

    if (!eventSeriesList.some((eventSeries) => this.isPrivateEvent(eventSeries))) {
      return eventSeriesList;
    }

    return eventSeriesList.filter((eventSeries) =>
      this.canViewerAccessEventWithMemberships(eventSeries, viewerOrgMemberships, viewerUserId, viewerUserRole),
    );
  }

  private static paginateVisibleEvents<T>(events: T[], pagination?: PaginationInput): T[] {
    if (!pagination) {
      return events;
    }

    const { skip, limit } = validatePaginationInput(pagination);
    return events.slice(skip ?? 0, (skip ?? 0) + limit);
  }

  private static shouldDeleteFutureExceptionsOnScheduleChange(
    previousSchedule: EventSchedule,
    nextSchedule: EventSchedule,
  ): boolean {
    return (
      getScheduleAnchorStartAt(previousSchedule).getTime() !== getScheduleAnchorStartAt(nextSchedule).getTime() ||
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

  static async canViewerAccessEvent(
    eventSeries: Pick<EventSeries, 'visibility' | 'orgId' | 'organizers'>,
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): Promise<boolean> {
    if (!this.isPrivateEvent(eventSeries)) {
      return true;
    }

    if (viewerUserRole === UserRole.Admin) {
      return true;
    }

    if (this.isViewerOrganizer(eventSeries, viewerUserId)) {
      return true;
    }

    const viewerOrgMemberships = await this.buildViewerOrgMembershipSet(viewerUserId);
    return this.canViewerAccessEventWithMemberships(eventSeries, viewerOrgMemberships, viewerUserId, viewerUserRole);
  }

  static async assertViewerCanAccessEvent(
    eventSeries: Pick<EventSeries, 'visibility' | 'orgId' | 'organizers'>,
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): Promise<void> {
    const canAccess = await this.canViewerAccessEvent(eventSeries, viewerUserId, viewerUserRole);
    if (!canAccess) {
      throw CustomError('EventSeries not found', ErrorTypes.NOT_FOUND);
    }
  }

  static async filterVisibleEvents<T extends Pick<EventSeries, 'visibility' | 'orgId' | 'organizers'>>(
    eventSeriesList: T[],
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): Promise<T[]> {
    if (viewerUserRole === UserRole.Admin) {
      return eventSeriesList;
    }

    if (!eventSeriesList.some((eventSeries) => this.isPrivateEvent(eventSeries))) {
      return eventSeriesList;
    }

    const viewerOrgMemberships = await this.buildViewerOrgMembershipSet(viewerUserId);
    return this.filterVisibleEventsWithMemberships(eventSeriesList, viewerOrgMemberships, viewerUserId, viewerUserRole);
  }

  static async readVisibleEventById(
    eventId: string,
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): Promise<EventSeries> {
    const eventSeries = await EventSeriesDAO.readEventById(eventId);
    await this.assertViewerCanAccessEvent(eventSeries, viewerUserId, viewerUserRole);
    return eventSeries;
  }

  static async readVisibleEventBySlug(
    slug: string,
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): Promise<EventSeries> {
    const eventSeries = await EventSeriesDAO.readEventBySlug(slug);
    await this.assertViewerCanAccessEvent(eventSeries, viewerUserId, viewerUserRole);
    return eventSeries;
  }

  static async readVisibleEventsByIds(
    eventIds: string[],
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): Promise<EventSeries[]> {
    const events = await EventSeriesDAO.readEventsByIds(eventIds);
    return this.filterVisibleEvents(events, viewerUserId, viewerUserRole);
  }

  static async readVisibleEvents(
    options?: EventsQueryOptionsInput,
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): Promise<EventSeries[]> {
    if (viewerUserRole === UserRole.Admin) {
      return EventSeriesDAO.readEvents(options);
    }

    const allMatchingEvents = await EventSeriesDAO.readEvents(
      options
        ? {
            ...options,
            pagination: undefined,
          }
        : undefined,
    );
    const visibleEvents = await this.filterVisibleEvents(allMatchingEvents, viewerUserId, viewerUserRole);
    return this.paginateVisibleEvents(visibleEvents, options?.pagination);
  }

  static async countVisibleEvents(
    options?: EventsQueryOptionsInput,
    viewerUserId?: string,
    viewerUserRole?: UserRole,
  ): Promise<number> {
    if (viewerUserRole === UserRole.Admin) {
      return EventSeriesDAO.countEvents(options);
    }

    const viewerOrgMemberships = await this.buildViewerOrgMembershipSet(viewerUserId);
    const batchLimit = sanitizeQueryLimit(
      EventSeriesService.EVENT_VISIBILITY_BATCH_SIZE,
      EventSeriesService.EVENT_VISIBILITY_BATCH_SIZE,
    );
    let visibleCount = 0;
    let currentSkip = 0;

    while (true) {
      const eventBatch = await EventSeriesDAO.readEvents({
        ...options,
        pagination: {
          skip: currentSkip,
          limit: batchLimit,
        },
      });

      if (eventBatch.length === 0) {
        break;
      }

      visibleCount += this.filterVisibleEventsWithMemberships(
        eventBatch,
        viewerOrgMemberships,
        viewerUserId,
        viewerUserRole,
      ).length;
      currentSkip += eventBatch.length;

      if (eventBatch.length < batchLimit) {
        break;
      }
    }

    return visibleCount;
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

  static async deleteById(
    eventId: string,
    actorId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<EventSeries> {
    const deletedEvent = await EventSeriesDAO.deleteEventById(eventId);
    await this.cleanupDeletedEventSideEffects(deletedEvent);
    if (actorId && actorRole) {
      AuditLogService.logEventDeleted({
        actorId,
        actorRole,
        eventId: deletedEvent.eventId,
        eventTitle: deletedEvent.title,
        orgId: deletedEvent.orgId ?? undefined,
        ipAddress,
      });
    }
    return deletedEvent;
  }

  static async deleteBySlug(
    slug: string,
    actorId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<EventSeries> {
    const deletedEvent = await EventSeriesDAO.deleteEventBySlug(slug);
    await this.cleanupDeletedEventSideEffects(deletedEvent);
    if (actorId && actorRole) {
      AuditLogService.logEventDeleted({
        actorId,
        actorRole,
        eventId: deletedEvent.eventId,
        eventTitle: deletedEvent.title,
        orgId: deletedEvent.orgId ?? undefined,
        ipAddress,
      });
    }
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
      getScheduleAnchorStartAt(eventSeries.primarySchedule),
      eventSeries.primarySchedule.recurrenceRule,
      occurrence.originalStartAt,
    );
    const successorDurationMinutes = occurrence.endAt
      ? Math.max(0, Math.round((occurrence.endAt.getTime() - occurrence.startAt.getTime()) / (60 * 1000)))
      : 0;

    const successorInput: CreateEventInput = {
      title: input.title ?? eventSeries.title,
      description: input.description ?? eventSeries.description,
      summary: input.summary ?? eventSeries.summary,
      primarySchedule: {
        ...eventSeries.primarySchedule,
        anchorStartAt: new Date(occurrence.startAt),
        occurrenceDurationMinutes: successorDurationMinutes,
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
