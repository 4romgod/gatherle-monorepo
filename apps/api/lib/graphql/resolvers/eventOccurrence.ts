import 'reflect-metadata';
import { Arg, Ctx, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import {
  EventOccurrence,
  EventOccurrenceParticipant,
  EventSeries,
  EventsQueryOptionsInput,
} from '@gatherle/commons/types';
import { EVENT_DESCRIPTIONS, RESOLVER_DESCRIPTIONS } from '@/constants';
import type { ServerContext } from '@/graphql';
import EventOccurrenceService from '@/services/eventOccurrence';
import { buildMyEventOccurrenceParticipantLoadKey } from '@/utils';
import { logger } from '@/utils/logger';

@Resolver(() => EventOccurrence)
export class EventOccurrenceResolver {
  @Query(() => [EventOccurrence], { description: RESOLVER_DESCRIPTIONS.EVENT.readEventOccurrences })
  async readEventOccurrences(
    @Arg('options', () => EventsQueryOptionsInput) options: EventsQueryOptionsInput,
  ): Promise<EventOccurrence[]> {
    logger.debug('[readEventOccurrences] GraphQL query options:', { options });
    return EventOccurrenceService.readEventOccurrences(options);
  }

  @FieldResolver(() => EventSeries, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.OCCURRENCE.EVENT_SERIES,
  })
  async eventSeries(@Root() occurrence: EventOccurrence, @Ctx() context: ServerContext): Promise<EventSeries | null> {
    return context.loaders.eventSeries.load(occurrence.eventSeriesId);
  }

  @FieldResolver(() => [EventOccurrenceParticipant], {
    nullable: true,
    description: EVENT_DESCRIPTIONS.OCCURRENCE.PARTICIPANTS,
  })
  async participants(
    @Root() occurrence: EventOccurrence,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrenceParticipant[]> {
    const participants = await context.loaders.eventOccurrenceParticipantsByOccurrence.load(occurrence.occurrenceId);
    const users = await Promise.all(participants.map((participant) => context.loaders.user.load(participant.userId)));

    return participants.map((participant, index) => ({
      ...participant,
      user: users[index] ?? undefined,
    }));
  }

  @FieldResolver(() => Int, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.OCCURRENCE.RSVP_COUNT,
  })
  async rsvpCount(@Root() occurrence: EventOccurrence, @Ctx() context: ServerContext): Promise<number> {
    if (typeof occurrence.rsvpCount === 'number') {
      return occurrence.rsvpCount;
    }

    return context.loaders.eventOccurrenceParticipantCountByOccurrence.load(occurrence.occurrenceId);
  }

  @FieldResolver(() => EventOccurrenceParticipant, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.OCCURRENCE.MY_RSVP,
  })
  async myRsvp(
    @Root() occurrence: EventOccurrence,
    @Ctx() context: ServerContext,
  ): Promise<EventOccurrenceParticipant | null> {
    if (!context.user?.userId) {
      return null;
    }

    return context.loaders.myEventOccurrenceParticipant.load(
      buildMyEventOccurrenceParticipantLoadKey(occurrence.occurrenceId, context.user.userId),
    );
  }
}
