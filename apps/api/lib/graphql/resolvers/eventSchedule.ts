import 'reflect-metadata';
import { FieldResolver, Int, Resolver, Root } from 'type-graphql';
import { EventSchedule } from '@gatherle/commons/server/types';
import { getScheduleAnchorStartAt, getScheduleDurationMinutes } from '@/utils';
import { normalizeRecurrenceRule } from '@/utils/rrule';

@Resolver(() => EventSchedule)
export class EventScheduleResolver {
  @FieldResolver(() => Date)
  anchorStartAt(@Root() schedule: EventSchedule): Date {
    return getScheduleAnchorStartAt(schedule);
  }

  @FieldResolver(() => Int)
  occurrenceDurationMinutes(@Root() schedule: EventSchedule): number {
    return getScheduleDurationMinutes(schedule);
  }

  @FieldResolver(() => String)
  recurrenceRule(@Root() schedule: EventSchedule): string {
    return normalizeRecurrenceRule(schedule.recurrenceRule);
  }
}
