import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import {
  CancelEventOccurrenceParticipantInput,
  EventOccurrence,
  EventOccurrenceParticipant,
  QueryOptionsInput,
  User,
  UserRole,
  UpsertEventOccurrenceParticipantInput,
} from '@gatherle/commons/server/types';
import { EVENT_DESCRIPTIONS, RESOLVER_DESCRIPTIONS } from '@/constants';
import { EventOccurrenceDAO, UserFeedDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { EventOccurrenceParticipantService, RecommendationService } from '@/services';
import { getAuthenticatedUser } from '@/utils/auth';
import { buildMyEventOccurrenceParticipantLoadKey, CustomError, ErrorTypes } from '@/utils';
import { logger } from '@/utils/logger';

function validateOccurrenceId(occurrenceId: string): void {
  if (!occurrenceId || !occurrenceId.trim()) {
    throw CustomError('Occurrence ID is required.', ErrorTypes.BAD_REQUEST);
  }
}

@Resolver(() => EventOccurrenceParticipant)
export class EventOccurrenceParticipantResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventOccurrenceParticipant, {
    description: RESOLVER_DESCRIPTIONS.EVENT_OCCURRENCE_PARTICIPANT.upsertEventOccurrenceParticipant,
  })
  async upsertEventOccurrenceParticipant(
    @Arg('input', () => UpsertEventOccurrenceParticipantInput) input: UpsertEventOccurrenceParticipantInput,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrenceParticipant> {
    validateOccurrenceId(input.occurrenceId);
    const user = getAuthenticatedUser(context);
    const participant = await EventOccurrenceParticipantService.rsvp(input, user.userId);
    const occurrence = await EventOccurrenceDAO.readByOccurrenceId(input.occurrenceId);

    if (occurrence) {
      UserFeedDAO.removeEventFromFeed(user.userId, occurrence.eventSeriesId).catch((error) => {
        logger.warn(
          '[EventOccurrenceParticipantResolver] Failed to remove event from feed after upsertEventOccurrenceParticipant',
          { error },
        );
      });
    }

    RecommendationService.computeFeedForUser(user.userId).catch((error) => {
      logger.warn('[EventOccurrenceParticipantResolver] Feed trigger failed after upsertEventOccurrenceParticipant', {
        error,
      });
    });

    return participant;
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventOccurrenceParticipant, {
    description: RESOLVER_DESCRIPTIONS.EVENT_OCCURRENCE_PARTICIPANT.cancelEventOccurrenceParticipant,
  })
  async cancelEventOccurrenceParticipant(
    @Arg('input', () => CancelEventOccurrenceParticipantInput) input: CancelEventOccurrenceParticipantInput,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrenceParticipant> {
    validateOccurrenceId(input.occurrenceId);
    const user = getAuthenticatedUser(context);
    const participant = await EventOccurrenceParticipantService.cancel(input.occurrenceId, user.userId);

    RecommendationService.computeFeedForUser(user.userId).catch((error) => {
      logger.warn('[EventOccurrenceParticipantResolver] Feed trigger failed after cancelEventOccurrenceParticipant', {
        error,
      });
    });

    return participant;
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventOccurrenceParticipant, {
    description: RESOLVER_DESCRIPTIONS.EVENT_OCCURRENCE_PARTICIPANT.checkInEventOccurrenceParticipant,
  })
  async checkInEventOccurrenceParticipant(
    @Arg('occurrenceId', () => String) occurrenceId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrenceParticipant> {
    validateOccurrenceId(occurrenceId);
    const user = getAuthenticatedUser(context);
    return EventOccurrenceParticipantService.checkIn(occurrenceId, user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [EventOccurrenceParticipant], {
    description: RESOLVER_DESCRIPTIONS.EVENT_OCCURRENCE_PARTICIPANT.readEventOccurrenceParticipants,
  })
  async readEventOccurrenceParticipants(
    @Arg('occurrenceId', () => String) occurrenceId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrenceParticipant[]> {
    validateOccurrenceId(occurrenceId);
    const participants = await context.loaders.eventOccurrenceParticipantsByOccurrence.load(occurrenceId);
    const users = await Promise.all(participants.map((participant) => context.loaders.user.load(participant.userId)));

    return participants.map((participant, index) => ({
      ...participant,
      user: users[index] ?? undefined,
    }));
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => EventOccurrenceParticipant, {
    nullable: true,
    description: RESOLVER_DESCRIPTIONS.EVENT_OCCURRENCE_PARTICIPANT.myEventOccurrenceRsvpStatus,
  })
  async myEventOccurrenceRsvpStatus(
    @Arg('occurrenceId', () => String) occurrenceId: string,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrenceParticipant | null> {
    validateOccurrenceId(occurrenceId);
    const user = getAuthenticatedUser(context);
    return context.loaders.myEventOccurrenceParticipant.load(
      buildMyEventOccurrenceParticipantLoadKey(occurrenceId, user.userId),
    );
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [EventOccurrenceParticipant], {
    description: RESOLVER_DESCRIPTIONS.EVENT_OCCURRENCE_PARTICIPANT.myEventOccurrenceRsvps,
  })
  async myEventOccurrenceRsvps(
    @Arg('includeCancelled', () => Boolean, { defaultValue: false }) includeCancelled: boolean,
    @Arg('options', () => QueryOptionsInput, { nullable: true }) options: QueryOptionsInput | undefined,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrenceParticipant[]> {
    const user = getAuthenticatedUser(context);
    return EventOccurrenceParticipantService.readByUser(user.userId, !includeCancelled, options);
  }

  @FieldResolver(() => User, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.USER })
  async user(@Root() participant: EventOccurrenceParticipant, @Ctx() context: ServerContext): Promise<User | null> {
    if (participant.user) {
      return participant.user;
    }

    return context.loaders.user.load(participant.userId);
  }

  @FieldResolver(() => EventOccurrence, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.PARTICIPANT.EVENT_OCCURRENCE,
  })
  async occurrence(
    @Root() participant: EventOccurrenceParticipant,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrence | null> {
    if (participant.occurrence) {
      return participant.occurrence;
    }

    return context.loaders.eventOccurrence.load(participant.occurrenceId);
  }
}
