import { RRule } from 'rrule';
import { EventOccurrenceDAO } from '@/mongodb/dao';
import { getOccurrencesInRange, getOccurrencesInRangeOrThrow } from '@/utils';
import type { EventOccurrence, EventSchedule, EventSeries } from '@gatherle/commons/types';
import { EventOccurrenceStatus, EventStatus } from '@gatherle/commons/types';

/** Maximum look-ahead window for materialising occurrence rows. Balances pre-computation cost with enough runway for schedulers and calendar integrations. */
const MATERIALIZATION_WINDOW_MONTHS = 6;
/** Hard cap on occurrences generated per sync run. Guards against runaway infinite RRULE expansions exhausting database write capacity. */
const MAX_WINDOW_OCCURRENCES = 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function extractRuleLine(rruleString: string): string {
  const lines = rruleString.split(/\r?\n/).map((line) => line.trim());
  const ruleLine = lines.find((line) => line.startsWith('RRULE:'));
  return ruleLine ? ruleLine.slice('RRULE:'.length) : rruleString.trim();
}

function parseRule(rruleString: string): RRule | null {
  try {
    return RRule.fromString(extractRuleLine(rruleString));
  } catch {
    return null;
  }
}

function countCalendarDaysInclusive(startAt: Date, endAt?: Date): number {
  if (!endAt) {
    return 1;
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
}

function getScheduleDurationMs(schedule: EventSchedule): number {
  if (!schedule.endAt) {
    return 0;
  }

  return Math.max(0, schedule.endAt.getTime() - schedule.startAt.getTime());
}

function buildWindowEnd(now: Date): Date {
  const windowEnd = new Date(now);
  windowEnd.setMonth(windowEnd.getMonth() + MATERIALIZATION_WINDOW_MONTHS);
  return windowEnd;
}

function mapOccurrenceStatus(eventStatus: EventStatus): EventOccurrenceStatus {
  switch (eventStatus) {
    case EventStatus.Cancelled:
      return EventOccurrenceStatus.Cancelled;
    case EventStatus.Completed:
      return EventOccurrenceStatus.Completed;
    default:
      return EventOccurrenceStatus.Scheduled;
  }
}

class EventOccurrenceService {
  static buildOccurrenceKey(eventSeriesId: string, originalStartAt: Date): string {
    return `${eventSeriesId}#${originalStartAt.toISOString()}`;
  }

  static async deleteOccurrencesForSeries(eventSeriesId: string): Promise<void> {
    await EventOccurrenceDAO.deleteByEventSeriesId(eventSeriesId);
  }

  static isRecurringSeries(eventSeries: Pick<EventSeries, 'primarySchedule'>): boolean {
    const schedule = eventSeries.primarySchedule;

    if (!schedule?.recurrenceRule) {
      return false;
    }

    const rule = parseRule(schedule.recurrenceRule);

    if (!rule) {
      return false;
    }

    if (rule.options.freq !== RRule.DAILY) {
      return true;
    }

    const singleEventSpanDays = countCalendarDaysInclusive(schedule.startAt, schedule.endAt);

    if (typeof rule.options.count === 'number') {
      return rule.options.count > singleEventSpanDays;
    }

    const singleEventEnd = schedule.endAt ?? schedule.startAt;
    if (rule.options.until instanceof Date && rule.options.until.getTime() <= singleEventEnd.getTime()) {
      return false;
    }

    const windowEnd = buildWindowEnd(schedule.startAt);
    const occurrenceCount = getOccurrencesInRange(
      schedule.recurrenceRule,
      schedule.startAt,
      windowEnd,
      singleEventSpanDays + 1,
    ).length;

    return occurrenceCount > singleEventSpanDays;
  }

  static buildOccurrencesForSeries(
    eventSeries: Pick<EventSeries, 'eventId' | 'primarySchedule' | 'status' | 'scheduleVersion'>,
    now: Date = new Date(),
  ): EventOccurrence[] {
    if (!this.isRecurringSeries(eventSeries)) {
      return [];
    }

    const schedule = eventSeries.primarySchedule;
    const durationMs = getScheduleDurationMs(schedule);
    const hasEndAt = Boolean(schedule.endAt);
    const windowStart = new Date(now.getTime() - durationMs);
    const windowEnd = buildWindowEnd(now);
    const originalStartTimes = getOccurrencesInRangeOrThrow(
      schedule.recurrenceRule,
      windowStart,
      windowEnd,
      MAX_WINDOW_OCCURRENCES,
    );
    const status = mapOccurrenceStatus(eventSeries.status);
    const seriesScheduleVersion = eventSeries.scheduleVersion ?? 1;

    return originalStartTimes.map((originalStartAt) => {
      const occurrenceKey = this.buildOccurrenceKey(eventSeries.eventId, originalStartAt);
      const startAt = new Date(originalStartAt);
      const endAt = hasEndAt ? new Date(startAt.getTime() + durationMs) : undefined;

      return {
        occurrenceId: occurrenceKey,
        eventSeriesId: eventSeries.eventId,
        occurrenceKey,
        originalStartAt: new Date(originalStartAt),
        startAt,
        endAt,
        timezone: schedule.timezone,
        status,
        isException: false,
        seriesScheduleVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  }

  static async syncRecurringSeriesOccurrences(
    eventSeries: Pick<EventSeries, 'eventId' | 'primarySchedule' | 'status' | 'scheduleVersion'>,
  ): Promise<void> {
    if (!this.isRecurringSeries(eventSeries)) {
      await this.deleteOccurrencesForSeries(eventSeries.eventId);
      return;
    }

    const occurrences = this.buildOccurrencesForSeries(eventSeries);
    await EventOccurrenceDAO.bulkUpsert(occurrences);
    await EventOccurrenceDAO.deleteMissingGeneratedOccurrences(
      eventSeries.eventId,
      occurrences.map((occurrence) => occurrence.occurrenceKey),
    );
  }
}

export default EventOccurrenceService;
