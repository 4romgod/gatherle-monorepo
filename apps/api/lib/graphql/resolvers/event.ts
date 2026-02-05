import 'reflect-metadata';
import { Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root, Ctx, Int } from 'type-graphql';
import type { User } from '@ntlango/commons/types';
import {
  CreateEventInput,
  Event,
  UpdateEventInput,
  UserRole,
  EventsQueryOptionsInput,
  EventCategory,
  EventOrganizer,
  EventParticipant,
  ParticipantStatus,
  Organization,
  OrganizationRole,
} from '@ntlango/commons/types';
import { ERROR_MESSAGES, validateInput, validateMongodbId } from '@/validation';
import { CreateEventInputSchema, UpdateEventInputSchema } from '@/validation/zod';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import { EventDAO, FollowDAO, EventParticipantDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/auth';
import { CustomError, ErrorTypes } from '@/utils/exceptions';

const EVENT_ORGANIZATION_ROLES = new Set([OrganizationRole.Owner, OrganizationRole.Admin, OrganizationRole.Host]);

@Resolver(() => Event)
export class EventResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, { description: RESOLVER_DESCRIPTIONS.EVENT.createEvent })
  async createEvent(
    @Arg('input', () => CreateEventInput) input: CreateEventInput,
    @Ctx() context: ServerContext,
  ): Promise<Event> {
    validateInput<CreateEventInput>(CreateEventInputSchema, input);
    const user = getAuthenticatedUser(context);
    if (input.orgId) {
      await this.ensureUserCanUseOrganization(input.orgId, user.userId);
    }
    return EventDAO.create(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, { description: RESOLVER_DESCRIPTIONS.EVENT.updateEvent })
  async updateEvent(
    @Arg('input', () => UpdateEventInput) input: UpdateEventInput,
    @Ctx() context: ServerContext,
  ): Promise<Event> {
    validateInput<UpdateEventInput>(UpdateEventInputSchema, input);
    const user = getAuthenticatedUser(context);
    if (input.orgId) {
      await this.ensureUserCanUseOrganization(input.orgId, user.userId);
    }
    return EventDAO.updateEvent(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, { description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventById })
  async deleteEventById(@Arg('eventId', () => String) eventId: string): Promise<Event> {
    validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId));
    return EventDAO.deleteEventById(eventId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, { description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventBySlug })
  async deleteEventBySlug(@Arg('slug', () => String) slug: string): Promise<Event> {
    return EventDAO.deleteEventBySlug(slug);
  }

  @Query(() => Event, { description: RESOLVER_DESCRIPTIONS.EVENT.readEventById })
  async readEventById(@Arg('eventId', () => String) eventId: string): Promise<Event | null> {
    validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId));
    return EventDAO.readEventById(eventId);
  }

  @Query(() => Event, { description: RESOLVER_DESCRIPTIONS.EVENT.readEventBySlug })
  async readEventBySlug(@Arg('slug', () => String) slug: string): Promise<Event | null> {
    return EventDAO.readEventBySlug(slug);
  }

  @Query(() => [Event], { description: RESOLVER_DESCRIPTIONS.EVENT.readEvents })
  async readEvents(
    @Arg('options', () => EventsQueryOptionsInput, { nullable: true }) options?: EventsQueryOptionsInput,
  ): Promise<Event[]> {
    logger.debug('[readEvents] GraphQL query options:', JSON.stringify(options, null, 2));
    return EventDAO.readEvents(options);
  }

  @FieldResolver(() => [EventCategory], { nullable: true })
  async eventCategories(@Root() event: Event, @Ctx() context: ServerContext): Promise<EventCategory[]> {
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
  async organizers(@Root() event: Event, @Ctx() context: ServerContext): Promise<EventOrganizer[]> {
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
  async organization(@Root() event: Event, @Ctx() context: ServerContext): Promise<Organization | null> {
    if (!event.orgId) {
      return null;
    }
    return context.loaders.organization.load(event.orgId);
  }

  /**
   * Field resolver to get participants for this event.
   * If already populated via aggregation pipeline, returns as-is.
   * Otherwise fetches from EventParticipant collection (fallback for mutations).
   */
  @FieldResolver(() => [EventParticipant], {
    nullable: true,
    description: "Participants who have RSVP'd to this event",
  })
  async participants(@Root() event: Event, @Ctx() context: ServerContext): Promise<EventParticipant[]> {
    // If already populated (from aggregation pipeline), return as-is
    if (event.participants && Array.isArray(event.participants) && event.participants.length > 0) {
      const first = event.participants[0];
      if (typeof first === 'object' && first !== null && 'participantId' in first) {
        return event.participants as EventParticipant[];
      }
    }

    // Use DataLoader to batch all event participant loads for this request
    const participants = await context.loaders.eventParticipantsByEvent.load(event.eventId);

    // Enrich with user data via DataLoader (batched per participant)
    const userIds = participants.map((p) => p.userId);
    const users = await Promise.all(userIds.map((id) => context.loaders.user.load(id)));
    return participants.map((participant, i) => ({
      ...participant,
      user: users[i] || undefined,
    })) as EventParticipant[];
  }

  /**
   * Field resolver to get the count of users who have saved this event.
   */
  @FieldResolver(() => Int, { description: 'Number of users who have saved this event' })
  async savedByCount(@Root() event: Event): Promise<number> {
    if (typeof event.savedByCount === 'number') {
      return event.savedByCount;
    }

    return FollowDAO.countSavesForEvent(event.eventId);
  }

  /**
   * Field resolver to check if the current user has saved this event.
   * Returns false if user is not authenticated.
   */
  @FieldResolver(() => Boolean, { description: 'Whether the current user has saved this event' })
  async isSavedByMe(@Root() event: Event, @Ctx() context: ServerContext): Promise<boolean> {
    if (!context.user?.userId) {
      return false;
    }
    return FollowDAO.isEventSavedByUser(event.eventId, context.user.userId);
  }

  /**
   * Field resolver to get the count of RSVPs for this event.
   * By default counts Going and Interested statuses (excludes Cancelled).
   */
  @FieldResolver(() => Int, { description: "Number of people who have RSVP'd to this event" })
  async rsvpCount(@Root() event: Event): Promise<number> {
    if (typeof event.rsvpCount === 'number') {
      return event.rsvpCount;
    }

    return EventParticipantDAO.countByEvent(event.eventId, [ParticipantStatus.Going, ParticipantStatus.Interested]);
  }

  /**
   * Field resolver to get the current user's RSVP status for this event.
   * Returns null if user is not authenticated or has not RSVP'd.
   */
  @FieldResolver(() => EventParticipant, { nullable: true, description: "Current user's RSVP for this event" })
  async myRsvp(@Root() event: Event, @Ctx() context: ServerContext): Promise<EventParticipant | null> {
    if (!context.user?.userId) {
      return null;
    }
    return EventParticipantDAO.readByEventAndUser(event.eventId, context.user.userId);
  }

  private async ensureUserCanUseOrganization(orgId: string, userId: string): Promise<void> {
    const membership = await OrganizationMembershipDAO.readMembershipByOrgIdAndUser(orgId, userId);
    if (!membership || !EVENT_ORGANIZATION_ROLES.has(membership.role)) {
      throw CustomError(
        'You do not have permission to create or update events for that organization.',
        ErrorTypes.UNAUTHORIZED,
      );
    }
  }
}
