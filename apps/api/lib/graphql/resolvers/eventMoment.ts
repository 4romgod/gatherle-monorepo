import 'reflect-metadata';
import { GraphQLError } from 'graphql';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import {
  CreateEventMomentInput,
  EventOccurrence,
  EventSeries,
  EventMoment,
  EventMomentPage,
  User,
  UserRole,
} from '@gatherle/commons/server/types';
import { validateInput } from '@/validation';
import { CreateEventMomentInputSchema } from '@/validation/zod';
import type { ServerContext } from '@/graphql';
import { getAuthenticatedUser } from '@/utils';
import { EventMomentService } from '@/services';

const ANONYMOUS_MOMENTS_FEED_LIMIT = 30;
const ANONYMOUS_MOMENTS_FEED_WINDOW_MS = 60_000;
const anonymousMomentsFeedRequests = new Map<string, number[]>();

const resolveMomentsFeedRequesterKey = (context: ServerContext): string => {
  const forwardedFor = context.req?.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return context.req?.ip ?? context.req?.socket?.remoteAddress ?? 'anonymous';
};

const assertMomentsFeedAccessAllowed = (context: ServerContext) => {
  if (context.user?.userId) {
    return;
  }

  const now = Date.now();
  const requesterKey = resolveMomentsFeedRequesterKey(context);
  const recentTimestamps = (anonymousMomentsFeedRequests.get(requesterKey) ?? []).filter(
    (timestamp) => now - timestamp < ANONYMOUS_MOMENTS_FEED_WINDOW_MS,
  );

  if (recentTimestamps.length >= ANONYMOUS_MOMENTS_FEED_LIMIT) {
    anonymousMomentsFeedRequests.set(requesterKey, recentTimestamps);
    throw new GraphQLError('Too many anonymous moments feed requests. Please try again shortly.', {
      extensions: {
        code: 'TOO_MANY_REQUESTS',
        http: { status: 429 },
      },
    });
  }

  recentTimestamps.push(now);
  anonymousMomentsFeedRequests.set(requesterKey, recentTimestamps);
};

export const __resetAnonymousMomentsFeedLimiterForTests = () => {
  anonymousMomentsFeedRequests.clear();
};

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

  @FieldResolver(() => EventSeries, { nullable: true })
  async event(@Root() moment: EventMoment, @Ctx() context: ServerContext): Promise<EventSeries | null> {
    if (!moment.eventId) return null;
    try {
      return await context.loaders.eventSeries.load(moment.eventId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => EventOccurrence, { nullable: true })
  async occurrence(@Root() moment: EventMoment, @Ctx() context: ServerContext): Promise<EventOccurrence | null> {
    if (!moment.occurrenceId) return null;
    try {
      return await context.loaders.eventOccurrence.load(moment.occurrenceId);
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
    // Pass the viewer's id so the DAO can include their own pending moments.
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

  // Public query — visibility is enforced per-user by EventMomentService.canViewProtectedUserMoments.
  @Query(() => EventMomentPage, { description: "Get a user's active moments across all events (profile story view)" })
  async readUserMoments(
    @Arg('userId', () => String) userId: string,
    @Ctx() context: ServerContext,
    @Arg('cursor', () => String, { nullable: true }) cursor?: string,
    @Arg('limit', () => Number, { nullable: true }) limit?: number,
  ): Promise<EventMomentPage> {
    return EventMomentService.readUserMomentsFeed(userId, context.user?.userId, cursor, limit);
  }

  @Query(() => EventMoment, { nullable: true, description: 'Get a single moment by id for deep links and replies' })
  async readMomentById(
    @Arg('momentId', () => String) momentId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventMoment | null> {
    return EventMomentService.readMomentById(momentId, context.user?.userId);
  }

  @Query(() => EventMomentPage, { description: 'Get a discoverable feed of all active moments' })
  async readMomentsFeed(
    @Ctx() context: ServerContext,
    @Arg('cursor', () => String, { nullable: true }) cursor?: string,
    @Arg('limit', () => Number, { nullable: true }) limit?: number,
  ): Promise<EventMomentPage> {
    assertMomentsFeedAccessAllowed(context);
    return EventMomentService.readMomentsFeed(context.user?.userId, cursor, limit);
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
