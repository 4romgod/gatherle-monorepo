import 'reflect-metadata';
import { Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root, Ctx, Int } from 'type-graphql';
import type { User } from '@gatherle/commons/server/types';
import {
  CancelEventOccurrenceInput,
  CreateEventInput,
  EventSeries,
  SplitEventSeriesInput,
  UpdateEventOccurrenceInput,
  UpdateEventInput,
  UserRole,
  EventsQueryOptionsInput,
  EventCategory,
  EventOccurrence,
  EventOrganizer,
  EventSeriesParticipant,
  Organization,
  OrganizationRole,
  EventLifecycleStatus,
  EventStatus,
} from '@gatherle/commons/server/types';
import { ERROR_MESSAGES, validateInput, validateMongodbId } from '@/validation';
import {
  CancelEventOccurrenceInputSchema,
  CreateEventInputSchema,
  SplitEventSeriesInputSchema,
  UpdateEventInputSchema,
  UpdateEventOccurrenceInputSchema,
} from '@/validation/zod';
import { EVENT_DESCRIPTIONS, HttpStatusCode, RESOLVER_DESCRIPTIONS } from '@/constants';
import { EventSeriesDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/auth';
import { CustomError, ErrorTypes } from '@/utils/exceptions';
import RecommendationService from '@/services/recommendation';
import EventSeriesService from '@/services/eventSeries';
import EventOccurrenceService from '@/services/eventOccurrence';
import {
  buildMyEventOccurrenceParticipantLoadKey,
  getRequestIpFromContext,
  projectOccurrenceParticipantToSeriesParticipant,
  resolveEventStatusFromOccurrence,
  resolveEventStatusFromSchedule,
  sanitizeQueryLimit,
} from '@/utils';

const EVENT_ORGANIZATION_ROLES = new Set([OrganizationRole.Owner, OrganizationRole.Admin, OrganizationRole.Host]);
type EventSeriesWithPreloadedMyRsvp = EventSeries & { myRsvp?: EventSeriesParticipant | null };
type EventSeriesWithPreloadedSaveState = EventSeries & { isSavedByMe?: boolean | null };

const hasPreloadedMyRsvp = (event: EventSeries): event is EventSeriesWithPreloadedMyRsvp => 'myRsvp' in event;
const hasPreloadedSaveState = (event: EventSeries): event is EventSeriesWithPreloadedSaveState =>
  'isSavedByMe' in event;

@Resolver(() => EventSeries)
export class EventSeriesResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeries, { description: RESOLVER_DESCRIPTIONS.EVENT.createEvent })
  async createEvent(
    @Arg('input', () => CreateEventInput) input: CreateEventInput,
    @Ctx() context: ServerContext,
  ): Promise<EventSeries> {
    validateInput<CreateEventInput>(CreateEventInputSchema, input);
    const user = getAuthenticatedUser(context);
    if (input.orgId) {
      await this.ensureUserCanUseOrganization(input.orgId, user.userId);
    }
    return EventSeriesService.create(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeries, { description: RESOLVER_DESCRIPTIONS.EVENT.updateEvent })
  async updateEvent(
    @Arg('input', () => UpdateEventInput) input: UpdateEventInput,
    @Ctx() context: ServerContext,
  ): Promise<EventSeries> {
    validateInput<UpdateEventInput>(UpdateEventInputSchema, input);
    const user = getAuthenticatedUser(context);
    const existingEvent = await EventSeriesDAO.readEventById(input.eventId);
    await this.ensureUserCanManageEventSeries(existingEvent, user.userId, user.userRole);
    if (input.orgId && input.orgId !== existingEvent.orgId) {
      await this.ensureUserCanUseOrganization(input.orgId, user.userId);
    }
    const updatedEvent = await EventSeriesService.update(input, existingEvent);

    // If this update transitioned the event to Published, notify the recommendation engine.
    // Fire-and-forget: errors must not block the mutation response.
    if (
      existingEvent.lifecycleStatus !== EventLifecycleStatus.Published &&
      updatedEvent.lifecycleStatus === EventLifecycleStatus.Published
    ) {
      RecommendationService.onEventPublished(updatedEvent.eventId).catch((err) => {
        logger.warn('[EventSeriesResolver] Feed trigger failed after event publish', { error: err });
      });
    }

    return updatedEvent;
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeries, { description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventById })
  async deleteEventById(
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventSeries> {
    validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('EventSeries', 'ID', eventId));
    const user = getAuthenticatedUser(context);
    const event = await EventSeriesDAO.readEventById(eventId);
    await this.ensureUserCanManageEventSeries(event, user.userId, user.userRole);
    return EventSeriesService.deleteById(eventId, user.userId, user.userRole, getRequestIpFromContext(context));
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeries, { description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventBySlug })
  async deleteEventBySlug(
    @Arg('slug', () => String) slug: string,
    @Ctx() context: ServerContext,
  ): Promise<EventSeries> {
    const user = getAuthenticatedUser(context);
    const event = await EventSeriesDAO.readEventBySlug(slug);
    await this.ensureUserCanManageEventSeries(event, user.userId, user.userRole);
    return EventSeriesService.deleteBySlug(slug, user.userId, user.userRole, getRequestIpFromContext(context));
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventOccurrence, { description: RESOLVER_DESCRIPTIONS.EVENT.updateEventOccurrence })
  async updateEventOccurrence(
    @Arg('input', () => UpdateEventOccurrenceInput) input: UpdateEventOccurrenceInput,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrence> {
    validateInput<UpdateEventOccurrenceInput>(UpdateEventOccurrenceInputSchema, input);
    const user = getAuthenticatedUser(context);
    const { eventSeries } = await EventOccurrenceService.readRecurringOccurrenceContext(input.occurrenceId);
    await this.ensureUserCanManageEventSeries(eventSeries, user.userId, user.userRole);
    return EventOccurrenceService.updateOccurrenceException(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventOccurrence, { description: RESOLVER_DESCRIPTIONS.EVENT.cancelEventOccurrence })
  async cancelEventOccurrence(
    @Arg('input', () => CancelEventOccurrenceInput) input: CancelEventOccurrenceInput,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrence> {
    validateInput<CancelEventOccurrenceInput>(CancelEventOccurrenceInputSchema, input);
    const user = getAuthenticatedUser(context);
    const { eventSeries } = await EventOccurrenceService.readRecurringOccurrenceContext(input.occurrenceId);
    await this.ensureUserCanManageEventSeries(eventSeries, user.userId, user.userRole);
    return EventOccurrenceService.cancelOccurrence(input.occurrenceId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeries, { description: RESOLVER_DESCRIPTIONS.EVENT.splitEventSeriesAtOccurrence })
  async splitEventSeriesAtOccurrence(
    @Arg('input', () => SplitEventSeriesInput) input: SplitEventSeriesInput,
    @Ctx() context: ServerContext,
  ): Promise<EventSeries> {
    validateInput<SplitEventSeriesInput>(SplitEventSeriesInputSchema, input);
    const user = getAuthenticatedUser(context);
    const { eventSeries } = await EventOccurrenceService.readRecurringOccurrenceContext(input.occurrenceId);
    await this.ensureUserCanManageEventSeries(eventSeries, user.userId, user.userRole);
    return EventSeriesService.splitAtOccurrence(input);
  }

  @Query(() => EventSeries, { description: RESOLVER_DESCRIPTIONS.EVENT.readEventById })
  async readEventById(
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventSeries | null> {
    validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('EventSeries', 'ID', eventId));
    return EventSeriesService.readVisibleEventById(eventId, context.user?.userId, context.user?.userRole);
  }

  @Query(() => EventSeries, { description: RESOLVER_DESCRIPTIONS.EVENT.readEventBySlug })
  async readEventBySlug(
    @Arg('slug', () => String) slug: string,
    @Ctx() context: ServerContext,
  ): Promise<EventSeries | null> {
    return EventSeriesService.readVisibleEventBySlug(slug, context.user?.userId, context.user?.userRole);
  }

  @Query(() => [EventSeries], { description: RESOLVER_DESCRIPTIONS.EVENT.readEvents })
  async readEvents(
    @Arg('options', () => EventsQueryOptionsInput, { nullable: true }) options?: EventsQueryOptionsInput,
    @Ctx() context?: ServerContext,
  ): Promise<EventSeries[]> {
    logger.debug('[readEvents] GraphQL query options:', { options });
    return EventSeriesService.readVisibleEvents(options, context?.user?.userId, context?.user?.userRole);
  }

  @Query(() => Int, { description: 'Read the total number of events.' })
  async readEventsCount(
    @Arg('options', () => EventsQueryOptionsInput, { nullable: true }) options?: EventsQueryOptionsInput,
    @Ctx() context?: ServerContext,
  ): Promise<number> {
    return EventSeriesService.countVisibleEvents(options, context?.user?.userId, context?.user?.userRole);
  }

  @Query(() => [EventSeries], { description: 'Read the top trending upcoming events ranked by RSVP + saved-by score.' })
  async readTrendingEvents(
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 }) limit?: number | null,
  ): Promise<EventSeries[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.trunc(limit!)) : 10;
    return EventSeriesService.readTrending(safeLimit);
  }

  @FieldResolver(() => [EventCategory], { nullable: true })
  async eventCategories(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<EventCategory[]> {
    // If already populated (from DAO), return as-is
    if (event.eventCategories && Array.isArray(event.eventCategories) && event.eventCategories.length > 0) {
      const first = event.eventCategories[0];
      if (typeof first === 'object' && first !== null && 'eventCategoryId' in first) {
        return event.eventCategories as EventCategory[];
      }
    }

    // Otherwise batch-load via DataLoader
    const categoryIds = (event.eventCategories || []).map((ref) =>
      typeof ref === 'string' ? ref : ref._id?.toString() || ref.toString(),
    );
    const categories = await Promise.all(categoryIds.map((id) => context.loaders.eventCategory.load(id)));
    return categories.filter((c): c is EventCategory => c !== null);
  }

  @FieldResolver(() => [EventOrganizer], { nullable: true })
  async organizers(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<EventOrganizer[]> {
    if (!event.organizers || event.organizers.length === 0) {
      return [];
    }

    // Batch-load user references for organizers
    const organizersWithUsers = await Promise.all(
      event.organizers.map(async (organizer) => {
        const userId =
          typeof organizer.user === 'string'
            ? organizer.user
            : organizer.user?._id?.toString() || (organizer.user as User)?.userId;

        if (!userId) {
          return organizer;
        }

        // Check if user is already populated
        if (typeof organizer.user === 'object' && organizer.user !== null && 'userId' in organizer.user) {
          return organizer;
        }

        // Batch-load via DataLoader
        const user = await context.loaders.user.load(userId);
        return {
          ...organizer,
          user: user || organizer.user,
        };
      }),
    );

    // Filter out organizers where user could not be loaded
    return organizersWithUsers.filter(
      (o) => o.user !== null && typeof o.user === 'object' && 'userId' in o.user,
    ) as any;
  }

  @FieldResolver(() => Organization, { nullable: true })
  async organization(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<Organization | null> {
    if (!event.orgId) {
      return null;
    }
    return context.loaders.organization.load(event.orgId);
  }

  /**
   * Field resolver to get participants for this event.
   * If already populated on the root object, returns as-is.
   * Otherwise resolves the representative occurrence for the series and projects
   * occurrence participants into the EventSeriesParticipant response shape.
   */
  @FieldResolver(() => [EventSeriesParticipant], {
    nullable: true,
    description: "Participants who have RSVP'd to this event",
  })
  async participants(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<EventSeriesParticipant[]> {
    if (event.participants && Array.isArray(event.participants) && event.participants.length > 0) {
      const first = event.participants[0];
      if (typeof first === 'object' && first !== null && 'participantId' in first) {
        return event.participants as EventSeriesParticipant[];
      }
    }

    const occurrence = await context.loaders.eventOccurrenceByEventSeries.load(event.eventId);
    if (!occurrence) {
      return [];
    }

    const participants = await context.loaders.eventOccurrenceParticipantsByOccurrence.load(occurrence.occurrenceId);
    const users = await Promise.all(participants.map((participant) => context.loaders.user.load(participant.userId)));

    return participants.map((participant, index) =>
      projectOccurrenceParticipantToSeriesParticipant(
        event.eventId,
        {
          ...participant,
          user: users[index] ?? undefined,
        },
        event,
      ),
    );
  }

  @FieldResolver(() => EventOccurrence, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.EVENT.REPRESENTATIVE_OCCURRENCE,
  })
  async representativeOccurrence(
    @Root() event: EventSeries,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrence | null> {
    return context.loaders.eventOccurrenceByEventSeries.load(event.eventId);
  }

  @FieldResolver(() => EventStatus, {
    description: EVENT_DESCRIPTIONS.EVENT.STATUS,
  })
  async status(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<EventStatus> {
    if (event.status === EventStatus.Cancelled) {
      return EventStatus.Cancelled;
    }

    const representativeOccurrence = await context.loaders.eventOccurrenceByEventSeries.load(event.eventId);

    if (representativeOccurrence) {
      return resolveEventStatusFromOccurrence(representativeOccurrence);
    }

    return resolveEventStatusFromSchedule(event.primarySchedule, event.status);
  }

  /**
   * Field resolver to get the count of users who have saved this event.
   */
  @FieldResolver(() => Int, { description: 'Number of users who have saved this event' })
  async savedByCount(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<number> {
    if (typeof event.savedByCount === 'number') {
      return event.savedByCount;
    }

    return context.loaders.eventSaveCount.load(event.eventId);
  }

  /**
   * Field resolver to check if the current user has saved this event.
   * Returns false if user is not authenticated.
   */
  @FieldResolver(() => Boolean, { description: 'Whether the current user has saved this event' })
  async isSavedByMe(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<boolean> {
    if (!context.user?.userId) {
      return false;
    }

    if (hasPreloadedSaveState(event) && typeof event.isSavedByMe === 'boolean') {
      return event.isSavedByMe;
    }

    return context.loaders.eventSavedByMe.load(event.eventId);
  }

  /**
   * Field resolver to get the count of RSVPs for this event.
   * Uses a pipeline-supplied count when present; otherwise counts RSVPs on the
   * representative occurrence for the series.
   */
  @FieldResolver(() => Int, { description: "Number of people who have RSVP'd to this event" })
  async rsvpCount(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<number> {
    if (typeof event.rsvpCount === 'number') {
      return event.rsvpCount;
    }

    const occurrence = await context.loaders.eventOccurrenceByEventSeries.load(event.eventId);
    if (!occurrence) {
      return 0;
    }

    return context.loaders.eventOccurrenceParticipantCountByOccurrence.load(occurrence.occurrenceId);
  }

  /**
   * Field resolver to get the current user's RSVP status for this event.
   * Returns null if user is not authenticated or has not RSVP'd to the
   * representative occurrence for this series.
   */
  @FieldResolver(() => EventSeriesParticipant, { nullable: true, description: "Current user's RSVP for this event" })
  async myRsvp(@Root() event: EventSeries, @Ctx() context: ServerContext): Promise<EventSeriesParticipant | null> {
    if (!context.user?.userId) {
      return null;
    }

    const preloadedMyRsvp = hasPreloadedMyRsvp(event) ? event.myRsvp : undefined;
    if (preloadedMyRsvp && typeof preloadedMyRsvp === 'object' && 'participantId' in preloadedMyRsvp) {
      return preloadedMyRsvp;
    }

    const occurrence = await context.loaders.eventOccurrenceByEventSeries.load(event.eventId);
    if (!occurrence) {
      return null;
    }

    const participant = await context.loaders.myEventOccurrenceParticipant.load(
      buildMyEventOccurrenceParticipantLoadKey(occurrence.occurrenceId, context.user.userId),
    );

    return participant ? projectOccurrenceParticipantToSeriesParticipant(event.eventId, participant, event) : null;
  }

  @FieldResolver(() => [EventOccurrence], {
    description: EVENT_DESCRIPTIONS.EVENT.UPCOMING_OCCURRENCES,
  })
  async upcomingOccurrences(
    @Root() event: EventSeries,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 5 }) limit?: number | null,
    @Arg('fromDate', () => Date, { nullable: true }) fromDate?: Date,
  ): Promise<EventOccurrence[]> {
    const safeLimit = sanitizeQueryLimit(limit, 5);
    return EventOccurrenceService.readUpcomingOccurrencesForSeries(event, safeLimit, fromDate ?? new Date());
  }

  public async ensureUserCanUseOrganization(orgId: string, userId: string): Promise<void> {
    const membership = await OrganizationMembershipDAO.readMembershipByOrgIdAndUser(orgId, userId);
    if (!membership || !EVENT_ORGANIZATION_ROLES.has(membership.role)) {
      throw CustomError(
        'You do not have permission to create or update events for that organization.',
        ErrorTypes.UNAUTHORIZED,
        { http: { status: HttpStatusCode.UNAUTHORIZED } },
      );
    }
  }

  public async ensureUserCanManageEventSeries(
    event: Pick<EventSeries, 'orgId' | 'organizers'>,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (userRole === UserRole.Admin) {
      return;
    }

    if (event.orgId) {
      await this.ensureUserCanUseOrganization(event.orgId, userId);
      return;
    }

    const isOrganizer = (event.organizers ?? []).some((organizer) => {
      if (typeof organizer.user === 'string') {
        return organizer.user === userId;
      }

      if (organizer.user && typeof organizer.user === 'object' && 'userId' in organizer.user) {
        return organizer.user.userId === userId;
      }

      if (organizer.user && typeof organizer.user === 'object' && '_id' in organizer.user) {
        return organizer.user._id?.toString() === userId;
      }

      return false;
    });

    if (!isOrganizer) {
      throw CustomError('You do not have permission to manage this event series.', ErrorTypes.UNAUTHORIZED, {
        http: { status: HttpStatusCode.UNAUTHORIZED },
      });
    }
  }
}
