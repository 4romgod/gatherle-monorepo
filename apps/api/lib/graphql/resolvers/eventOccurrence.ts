import 'reflect-metadata';
import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { EventOccurrence, EventSeries, EventsQueryOptionsInput } from '@gatherle/commons/types';
import { EVENT_DESCRIPTIONS, RESOLVER_DESCRIPTIONS } from '@/constants';
import type { ServerContext } from '@/graphql';
import { logger } from '@/utils/logger';
import EventOccurrenceService from '@/services/eventOccurrence';

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
}
