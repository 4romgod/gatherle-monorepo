import type { EventSchedule } from '@gatherle/commons/types';

export function areEventSchedulesEqual(left: EventSchedule, right: EventSchedule): boolean {
  const leftEndAt = left.endAt?.getTime() ?? null;
  const rightEndAt = right.endAt?.getTime() ?? null;

  return (
    left.startAt.getTime() === right.startAt.getTime() &&
    leftEndAt === rightEndAt &&
    left.timezone === right.timezone &&
    (left.recurrenceRule ?? null) === (right.recurrenceRule ?? null)
  );
}
