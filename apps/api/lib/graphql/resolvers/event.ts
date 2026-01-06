import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root, Ctx} from 'type-graphql';
import {CreateEventInput, Event, UpdateEventInput, UserRole, QueryOptionsInput, EventCategory, EventOrganizer, User} from '@ntlango/commons/types';
import {ERROR_MESSAGES, validateInput, validateMongodbId} from '@/validation';
import {CreateEventInputSchema, UpdateEventInputSchema} from '@/validation/zod';
import {RESOLVER_DESCRIPTIONS} from '@/constants';
import {EventDAO} from '@/mongodb/dao';
import type {ServerContext} from '@/graphql';

@Resolver(() => Event)
export class EventResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.createEvent})
  async createEvent(@Arg('input', () => CreateEventInput) input: CreateEventInput): Promise<Event> {
    validateInput<CreateEventInput>(CreateEventInputSchema, input);
    return EventDAO.create(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.updateEvent})
  async updateEvent(@Arg('input', () => UpdateEventInput) input: UpdateEventInput): Promise<Event> {
    validateInput<UpdateEventInput>(UpdateEventInputSchema, input);
    return EventDAO.updateEvent(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventById})
  async deleteEventById(@Arg('eventId', () => String) eventId: string): Promise<Event> {
    validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId));
    return EventDAO.deleteEventById(eventId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventBySlug})
  async deleteEventBySlug(@Arg('slug', () => String) slug: string): Promise<Event> {
    return EventDAO.deleteEventBySlug(slug);
  }

  @Query(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.readEventById})
  async readEventById(@Arg('eventId', () => String) eventId: string): Promise<Event | null> {
    validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId));
    return EventDAO.readEventById(eventId);
  }

  @Query(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.readEventBySlug})
  async readEventBySlug(@Arg('slug', () => String) slug: string): Promise<Event | null> {
    return EventDAO.readEventBySlug(slug);
  }

  @Query(() => [Event], {description: RESOLVER_DESCRIPTIONS.EVENT.readEvents})
  async readEvents(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<Event[]> {
    return EventDAO.readEvents(options);
  }

  @FieldResolver(() => [EventCategory], {nullable: true})
  async eventCategories(@Root() event: Event, @Ctx() context: ServerContext): Promise<EventCategory[]> {
    // If already populated (from DAO), return as-is
    if (event.eventCategories && Array.isArray(event.eventCategories) && event.eventCategories.length > 0) {
      const first = event.eventCategories[0];
      if (typeof first === 'object' && first !== null && 'eventCategoryId' in first) {
        return event.eventCategories as EventCategory[];
      }
    }

    // Otherwise batch-load via DataLoader
    const categoryIds = (event.eventCategories || []).map((ref) => (typeof ref === 'string' ? ref : ref._id?.toString() || ref.toString()));
    const categories = await Promise.all(categoryIds.map((id) => context.loaders.eventCategory.load(id)));
    return categories.filter((c): c is EventCategory => c !== null);
  }

  @FieldResolver(() => [EventOrganizer], {nullable: true})
  async organizers(@Root() event: Event, @Ctx() context: ServerContext): Promise<EventOrganizer[]> {
    if (!event.organizers || event.organizers.length === 0) {
      return [];
    }

    // Batch-load user references for organizers
    const organizersWithUsers = await Promise.all(
      event.organizers.map(async (organizer) => {
        const userId = typeof organizer.user === 'string' ? organizer.user : organizer.user?._id?.toString() || (organizer.user as User)?.userId;

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
    return organizersWithUsers.filter((o) => o.user !== null && typeof o.user === 'object' && 'userId' in o.user) as any;
  }
}
