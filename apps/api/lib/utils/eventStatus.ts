import type { EventOccurrence, EventSchedule } from '@gatherle/commons/types';
import { EventOccurrenceStatus, EventStatus } from '@gatherle/commons/types';
import { getScheduleAnchorStartAt, getScheduleDurationMinutes } from './eventSchedule';
import { getNextOccurrence } from './rrule';

type EventOccurrenceStatusSource = Pick<EventOccurrence, 'startAt' | 'endAt' | 'status'>;
type EventOccurrenceDateSource = Pick<EventOccurrence, 'startAt' | 'endAt'>;

function buildOccurrenceEndAt(startAt: Date, endAt?: Date) {
  return endAt ?? startAt;
}

export function resolveEventStatusFromOccurrence(
  occurrence: EventOccurrenceStatusSource,
  now: Date = new Date(),
): EventStatus {
  if (occurrence.status === EventOccurrenceStatus.Cancelled) {
    return EventStatus.Cancelled;
  }

  if (occurrence.status === EventOccurrenceStatus.Completed) {
    return EventStatus.Completed;
  }

  const nowTimestamp = now.getTime();
  const startTimestamp = occurrence.startAt.getTime();
  const endTimestamp = buildOccurrenceEndAt(occurrence.startAt, occurrence.endAt).getTime();

  if (endTimestamp < nowTimestamp) {
    return EventStatus.Completed;
  }

  if (startTimestamp > nowTimestamp) {
    return EventStatus.Upcoming;
  }

  return EventStatus.Ongoing;
}

export function resolveOccurrenceLifecycleStatus(
  occurrence: EventOccurrenceDateSource,
  eventStatus: EventStatus,
  now: Date = new Date(),
): EventOccurrenceStatus {
  if (eventStatus === EventStatus.Cancelled) {
    return EventOccurrenceStatus.Cancelled;
  }

  if (eventStatus === EventStatus.Completed) {
    return EventOccurrenceStatus.Completed;
  }

  const derivedStatus = resolveEventStatusFromOccurrence(
    {
      ...occurrence,
      status: EventOccurrenceStatus.Scheduled,
    },
    now,
  );

  return derivedStatus === EventStatus.Completed ? EventOccurrenceStatus.Completed : EventOccurrenceStatus.Scheduled;
}

export function resolveEventStatusFromSchedule(
  schedule: EventSchedule | null | undefined,
  persistedStatus?: EventStatus | null,
  now: Date = new Date(),
): EventStatus {
  if (persistedStatus === EventStatus.Cancelled) {
    return EventStatus.Cancelled;
  }

  if (!schedule?.anchorStartAt) {
    return persistedStatus ?? EventStatus.Upcoming;
  }

  const anchorStartAt = getScheduleAnchorStartAt(schedule);
  const durationMs = Math.max(0, getScheduleDurationMinutes(schedule) * 60 * 1000);
  const probeStart = durationMs > 0 ? new Date(now.getTime() - durationMs) : now;
  const occurrenceStartAt = schedule.recurrenceRule
    ? getNextOccurrence(anchorStartAt, schedule.recurrenceRule, probeStart)
    : anchorStartAt;

  if (!occurrenceStartAt) {
    return EventStatus.Completed;
  }

  return resolveEventStatusFromOccurrence(
    {
      startAt: occurrenceStartAt,
      endAt: durationMs > 0 ? new Date(occurrenceStartAt.getTime() + durationMs) : undefined,
      status: EventOccurrenceStatus.Scheduled,
    },
    now,
  );
}
