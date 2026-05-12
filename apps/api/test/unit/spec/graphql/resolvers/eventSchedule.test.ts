import { EventScheduleResolver } from '@/graphql/resolvers/eventSchedule';
import type { EventSchedule } from '@gatherle/commons/types';

describe('EventScheduleResolver', () => {
  const resolver = new EventScheduleResolver();

  it('projects legacy start/end schedules into the anchor and duration fields', () => {
    const legacySchedule = {
      startAt: new Date('2026-05-15T06:00:00.000Z'),
      endAt: new Date('2026-05-17T15:00:00.000Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20260515T060000Z\nRRULE:FREQ=MONTHLY;COUNT=3',
    } as unknown as EventSchedule;

    expect(resolver.anchorStartAt(legacySchedule)).toEqual(new Date('2026-05-15T06:00:00.000Z'));
    expect(resolver.occurrenceDurationMinutes(legacySchedule)).toBe(3420);
    expect(resolver.recurrenceRule(legacySchedule)).toBe('FREQ=MONTHLY;COUNT=3');
  });

  it('returns new schedule fields unchanged', () => {
    const schedule = {
      anchorStartAt: new Date('2026-05-15T06:00:00.000Z'),
      occurrenceDurationMinutes: 180,
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'FREQ=WEEKLY;COUNT=4;BYDAY=FR',
    } as EventSchedule;

    expect(resolver.anchorStartAt(schedule)).toEqual(schedule.anchorStartAt);
    expect(resolver.occurrenceDurationMinutes(schedule)).toBe(180);
    expect(resolver.recurrenceRule(schedule)).toBe('FREQ=WEEKLY;COUNT=4;BYDAY=FR');
  });
});
