import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CreateEventMomentInput, Event, EventMoment, EventMomentPage, User, UserRole } from '@gatherle/commons/types';
import { validateInput } from '@/validation';
import { CreateEventMomentInputSchema } from '@/validation/zod';
import type { ServerContext } from '@/graphql';
import { getAuthenticatedUser } from '@/utils';
import { EventMomentService } from '@/services';

@Resolver(() => EventMoment)
export class EventMomentResolver {
  @FieldResolver(() => User, { nullable: true })
  async author(@Root() moment: EventMoment, @Ctx() context: ServerContext): Promise<User | null> {
    if (!moment.authorId) return null;
    try {
      return await context.loaders.user.load(moment.authorId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => Event, { nullable: true })
  async event(@Root() moment: EventMoment, @Ctx() context: ServerContext): Promise<Event | null> {
    if (!moment.eventId) return null;
    try {
      return await context.loaders.event.load(moment.eventId);
    } catch {
      return null;
    }
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventMoment, { description: 'Post an ephemeral moment to an event (requires Going/CheckedIn RSVP)' })
  async createEventMoment(
    @Arg('input', () => CreateEventMomentInput) input: CreateEventMomentInput,
    @Ctx() context: ServerContext,
  ): Promise<EventMoment> {
    validateInput(CreateEventMomentInputSchema, input);
    const caller = getAuthenticatedUser(context);
    return EventMomentService.create(input, caller.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, { description: 'Delete an event moment (author or event organizer only)' })
  async deleteEventMoment(
    @Arg('momentId', () => String) momentId: string,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const caller = getAuthenticatedUser(context);
    return EventMomentService.delete(momentId, caller.userId);
  }

  @Query(() => EventMomentPage, { description: 'Get all active moments for an event (event page ring view)' })
  async readEventMoments(
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
    @Arg('cursor', () => String, { nullable: true }) cursor?: string,
    @Arg('limit', () => Number, { nullable: true }) limit?: number,
  ): Promise<EventMomentPage> {
    // context.user is populated for authenticated requests (no @Authorized required).
    // Pass the viewer's id so the DAO can include their own Processing moments.
    return EventMomentService.readByEvent(eventId, cursor, limit, context.user?.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [EventMoment], { description: "Get a user's moments for a specific event (respects follow policy)" })
  async readUserEventMoments(
    @Arg('userId', () => String) userId: string,
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventMoment[]> {
    const caller = getAuthenticatedUser(context);
    return EventMomentService.readUserMoments(userId, eventId, caller.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => EventMomentPage, { description: 'Get moments from followed users (personal feed)' })
  async readFollowedMoments(
    @Ctx() context: ServerContext,
    @Arg('cursor', () => String, { nullable: true }) cursor?: string,
    @Arg('limit', () => Number, { nullable: true }) limit?: number,
  ): Promise<EventMomentPage> {
    const caller = getAuthenticatedUser(context);
    return EventMomentService.readFollowedMoments(caller.userId, cursor, limit);
  }
}
