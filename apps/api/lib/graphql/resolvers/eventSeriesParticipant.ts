import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import {
  CancelEventParticipantInput,
  EventSeriesParticipant,
  UpsertEventParticipantInput,
  User,
  UserRole,
  EventSeries,
} from '@gatherle/commons/types';
import { EventSeriesParticipantDAO, UserFeedDAO } from '@/mongodb/dao';
import { validateMongodbId } from '@/validation';
import type { ServerContext } from '@/graphql';
import { EventSeriesParticipantService } from '@/services';
import { CustomError, ErrorTypes } from '@/utils/exceptions';
import RecommendationService from '@/services/recommendation';
import { logger } from '@/utils/logger';

@Resolver(() => EventSeriesParticipant)
export class EventSeriesParticipantResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventSeriesParticipant)
  async upsertEventParticipant(
    @Arg('input', () => UpsertEventParticipantInput) input: UpsertEventParticipantInput,
  ): Promise<EventSeriesParticipant> {
    validateMongodbId(input.eventId);
    validateMongodbId(input.userId);
    const participant = await EventSeriesParticipantService.rsvp(input);

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
  ): Promise<EventSeriesParticipant> {
    validateMongodbId(input.eventId);
    validateMongodbId(input.userId);
    const participant = await EventSeriesParticipantService.cancel(input);

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
    return EventSeriesParticipantService.checkIn(eventId, context.user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [EventSeriesParticipant])
  async readEventParticipants(
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventSeriesParticipant[]> {
    validateMongodbId(eventId);
    return context.loaders.eventSeriesParticipantsByEvent.load(eventId);
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
    // TODO Use the DataLoader if you have the participantId, otherwise fallback to DAO
    // Here, we still need to query by eventId+userId, so use DAO
    return EventSeriesParticipantDAO.readByEventAndUser(eventId, context.user.userId);
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
    // TODO Still need to query by userId, so use DAO for now
    return EventSeriesParticipantDAO.readByUser(context.user.userId, !includeCancelled);
  }

  @FieldResolver(() => User, { nullable: true })
  async user(@Root() participant: EventSeriesParticipant, @Ctx() context: ServerContext): Promise<User | null> {
    if (!participant.userId) return null;
    try {
      return await context.loaders.user.load(participant.userId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => EventSeries, { nullable: true })
  async event(@Root() participant: EventSeriesParticipant, @Ctx() context: ServerContext): Promise<EventSeries | null> {
    if (!participant.eventId) return null;
    try {
      return await context.loaders.eventSeries.load(participant.eventId);
    } catch {
      return null;
    }
  }
}
