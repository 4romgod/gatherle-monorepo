import type { EventSchedule } from '@gatherle/commons/server/types';

type LegacyEventSchedule = Partial<EventSchedule> & {
  startAt?: Date;
  endAt?: Date;
};

export function getScheduleAnchorStartAt(schedule: LegacyEventSchedule | null | undefined): Date {
  return new Date(schedule?.anchorStartAt ?? schedule?.startAt ?? Number.NaN);
}

export function getScheduleDurationMinutes(schedule: LegacyEventSchedule | null | undefined): number {
  if (typeof schedule?.occurrenceDurationMinutes === 'number') {
    return Math.max(0, schedule.occurrenceDurationMinutes);
  }

  if (schedule?.startAt && schedule?.endAt) {
    return Math.max(0, Math.round((schedule.endAt.getTime() - schedule.startAt.getTime()) / (60 * 1000)));
  }

  return 0;
}

export function getScheduleEndAt(schedule: LegacyEventSchedule | null | undefined): Date | undefined {
  if (schedule?.endAt instanceof Date) {
    return new Date(schedule.endAt);
  }

  const anchorStartAt = getScheduleAnchorStartAt(schedule);
  const durationMinutes = getScheduleDurationMinutes(schedule);
  if (!Number.isFinite(anchorStartAt.getTime()) || durationMinutes <= 0) {
    return undefined;
  }

  return new Date(anchorStartAt.getTime() + durationMinutes * 60 * 1000);
}

export function areEventSchedulesEqual(left: EventSchedule, right: EventSchedule): boolean {
  return (
    getScheduleAnchorStartAt(left).getTime() === getScheduleAnchorStartAt(right).getTime() &&
    getScheduleDurationMinutes(left) === getScheduleDurationMinutes(right) &&
    left.timezone === right.timezone &&
    (left.recurrenceRule ?? null) === (right.recurrenceRule ?? null)
  );
}
