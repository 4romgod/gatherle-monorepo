import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import {
  CancelEventParticipantInput,
  EventSeriesParticipant,
  UpsertEventParticipantInput,
  User,
  UserRole,
  EventSeries,
} from '@gatherle/commons/server/types';
import { UserFeedDAO } from '@/mongodb/dao';
import { validateMongodbId } from '@/validation';
import type { ServerContext } from '@/graphql';
import { EventSeriesParticipantService } from '@/services';
import { CustomError, ErrorTypes } from '@/utils/exceptions';
import RecommendationService from '@/services/recommendation';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/auth';

@Resolver(() => EventSeriesParticipant)
export class EventSeriesParticipantResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeriesParticipant)
  async upsertEventParticipant(
    @Arg('input', () => UpsertEventParticipantInput) input: UpsertEventParticipantInput,
    @Ctx() context: ServerContext,
  ): Promise<EventSeriesParticipant> {
    validateMongodbId(input.eventId);
    const user = getAuthenticatedUser(context);
    if (input.userId !== user.userId) {
      throw CustomError('You can only RSVP on your own behalf.', ErrorTypes.UNAUTHORIZED);
    }

    const participant = await EventSeriesParticipantService.rsvp(input, user.userId, user.userRole);

    UserFeedDAO.removeEventFromFeed(input.userId, input.eventId).catch((err) => {
      logger.warn('[EventSeriesParticipantResolver] Failed to remove event from feed after upsertEventParticipant', {
        error: err,
      });
    });
    RecommendationService.computeFeedForUser(input.userId).catch((err) => {
      logger.warn('[EventSeriesParticipantResolver] Feed trigger failed after upsertEventParticipant', { error: err });
    });

    return participant;
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeriesParticipant)
  async cancelEventParticipant(
    @Arg('input', () => CancelEventParticipantInput) input: CancelEventParticipantInput,
    @Ctx() context: ServerContext,
  ): Promise<EventSeriesParticipant> {
    validateMongodbId(input.eventId);
    const user = getAuthenticatedUser(context);
    if (input.userId !== user.userId) {
      throw CustomError('You can only cancel your own RSVP.', ErrorTypes.UNAUTHORIZED);
    }

    const participant = await EventSeriesParticipantService.cancel(input, user.userId, user.userRole);

    RecommendationService.computeFeedForUser(input.userId).catch((err) => {
      logger.warn('[EventSeriesParticipantResolver] Feed trigger failed after cancelEventParticipant', { error: err });
    });

    return participant;
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeriesParticipant, { description: 'Check the current user in to an event' })
  async checkInEventParticipant(
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventSeriesParticipant> {
    validateMongodbId(eventId);
    if (!context.user?.userId) {
      throw CustomError('User not authenticated', ErrorTypes.UNAUTHENTICATED);
    }
    return EventSeriesParticipantService.checkIn(
      eventId,
      context.user.userId,
      context.user.userId,
      context.user.userRole,
    );
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [EventSeriesParticipant])
  async readEventParticipants(
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventSeriesParticipant[]> {
    validateMongodbId(eventId);
    return EventSeriesParticipantService.readByEvent(eventId, context.user?.userId, context.user?.userRole);
  }

  /**
   * Get the current user's RSVP status for a specific event.
   * Returns null if the user has not RSVP'd to the event.
   */
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => EventSeriesParticipant, {
    nullable: true,
    description: "Get the current user's RSVP for a specific event",
  })
  async myRsvpStatus(
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventSeriesParticipant | null> {
    validateMongodbId(eventId);
    if (!context.user?.userId) {
      return null;
    }
    return EventSeriesParticipantService.readByEventAndUser(
      eventId,
      context.user.userId,
      context.user.userId,
      context.user.userRole,
    );
  }

  /**
   * Get all events the current user has RSVP'd to.
   * Returns active RSVPs by default (excludes cancelled).
   */
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [EventSeriesParticipant], { description: "Get all events the current user has RSVP'd to" })
  async myRsvps(
    @Arg('includeCancelled', () => Boolean, { nullable: true, defaultValue: false }) includeCancelled: boolean,
    @Ctx() context: ServerContext,
  ): Promise<EventSeriesParticipant[]> {
    if (!context.user?.userId) {
      return [];
    }
    return EventSeriesParticipantService.readByUser(
      context.user.userId,
      !includeCancelled,
      context.user.userId,
      context.user.userRole,
    );
  }

  @FieldResolver(() => User, { nullable: true })
  async user(@Root() participant: EventSeriesParticipant, @Ctx() context: ServerContext): Promise<User | null> {
    if (participant.user) {
      return participant.user;
    }

    if (!participant.userId) return null;
    try {
      return await context.loaders.user.load(participant.userId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => EventSeries, { nullable: true })
  async event(@Root() participant: EventSeriesParticipant, @Ctx() context: ServerContext): Promise<EventSeries | null> {
    if (participant.event) {
      return participant.event;
    }

    if (!participant.eventId) return null;
    try {
      return await context.loaders.eventSeries.load(participant.eventId);
    } catch {
      return null;
    }
  }
}
