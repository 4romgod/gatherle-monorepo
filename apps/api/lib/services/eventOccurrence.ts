import { RRule } from 'rrule';
import { EventOccurrenceDAO, EventOccurrenceParticipantDAO, EventSeriesDAO } from '@/mongodb/dao';
import {
  CustomError,
  ErrorTypes,
  getDateRangeForFilter,
  getOccurrencesInRange,
  getOccurrencesInRangeOrThrow,
  pickRepresentativeOccurrence,
  splitRecurringRuleAtOccurrence,
} from '@/utils';
import type {
  EventOccurrence,
  EventSchedule,
  EventSeries,
  EventsQueryOptionsInput,
  UpdateEventOccurrenceInput,
  SortInput,
} from '@gatherle/commons/types';
import { SortOrderInput } from '@gatherle/commons/types';
import { EventOccurrenceStatus, EventStatus } from '@gatherle/commons/types';
import { DATE_FILTER_OPTIONS } from '@gatherle/commons';
import { sanitizeQueryLimit, validatePaginationInput } from '@/utils';
import { logger } from '@/utils/logger';

/** Maximum look-ahead window for materialising occurrence rows. Balances pre-computation cost with enough runway for schedulers and calendar integrations. */
const MATERIALIZATION_WINDOW_MONTHS = 6;
/** Hard cap on occurrences generated per sync run. Guards against runaway infinite RRULE expansions exhausting database write capacity. */
const MAX_WINDOW_OCCURRENCES = 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type OccurrenceQuerySeries = Pick<
  EventSeries,
  'eventId' | 'slug' | 'primarySchedule' | 'status' | 'scheduleVersion'
> & {
  createdAt?: Date;
  updatedAt?: Date;
};

const DEFAULT_OCCURRENCE_SORT: SortInput[] = [{ field: 'startAt', order: SortOrderInput.asc }];
const SUPPORTED_OCCURRENCE_SORT_FIELDS = new Set([
  'createdAt',
  'endAt',
  'eventSeriesId',
  'occurrenceId',
  'occurrenceKey',
  'originalStartAt',
  'seriesScheduleVersion',
  'startAt',
  'status',
  'timezone',
  'updatedAt',
]);

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

function resolveOccurrenceDateRange(
  options?: Pick<EventsQueryOptionsInput, 'customDate' | 'dateFilterOption' | 'dateRange'>,
) {
  if (options?.customDate) {
    const { startDate, endDate } = getDateRangeForFilter(DATE_FILTER_OPTIONS.CUSTOM, new Date(options.customDate));
    return { startDate, endDate };
  }

  if (options?.dateFilterOption) {
    const { startDate, endDate } = getDateRangeForFilter(options.dateFilterOption, undefined);
    return { startDate, endDate };
  }

  const startDate = options?.dateRange?.startDate ? new Date(options.dateRange.startDate) : undefined;
  const endDate = options?.dateRange?.endDate ? new Date(options.dateRange.endDate) : undefined;

  if (!startDate || !endDate) {
    throw CustomError(
      'readEventOccurrences requires customDate, dateFilterOption, or a dateRange with both startDate and endDate.',
      ErrorTypes.BAD_REQUEST,
    );
  }

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw CustomError('Occurrence date filters must be valid dates.', ErrorTypes.BAD_REQUEST);
  }

  if (startDate.getTime() > endDate.getTime()) {
    throw CustomError(
      'Occurrence date range startDate must be earlier than or equal to endDate.',
      ErrorTypes.BAD_REQUEST,
    );
  }

  return { startDate, endDate };
}

function getOccurrenceComparableValue(occurrence: EventOccurrence, field: string): number | string | boolean | null {
  const value = (occurrence as unknown as Record<string, unknown>)[field];

  if (value instanceof Date) {
    return value.getTime();
  }

  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
}

function compareOccurrenceValues(
  left: number | string | boolean | null,
  right: number | string | boolean | null,
): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right));
}

function sortOccurrences(occurrences: EventOccurrence[], sort?: SortInput[]): EventOccurrence[] {
  const sortInput = sort && sort.length > 0 ? sort : DEFAULT_OCCURRENCE_SORT;

  for (const sortEntry of sortInput) {
    if (!SUPPORTED_OCCURRENCE_SORT_FIELDS.has(sortEntry.field)) {
      throw CustomError(
        `Occurrence sorting only supports: ${Array.from(SUPPORTED_OCCURRENCE_SORT_FIELDS).sort().join(', ')}.`,
        ErrorTypes.BAD_REQUEST,
      );
    }
  }

  return [...occurrences].sort((left, right) => {
    for (const sortEntry of sortInput) {
      const comparison = compareOccurrenceValues(
        getOccurrenceComparableValue(left, sortEntry.field),
        getOccurrenceComparableValue(right, sortEntry.field),
      );

      if (comparison !== 0) {
        return sortEntry.order === 'desc' ? -comparison : comparison;
      }
    }

    return left.occurrenceKey.localeCompare(right.occurrenceKey);
  });
}

function paginateOccurrences(occurrences: EventOccurrence[], options?: EventsQueryOptionsInput): EventOccurrence[] {
  if (!options?.pagination) {
    return occurrences;
  }

  const { skip, limit } = validatePaginationInput(options.pagination);
  return occurrences.slice(skip ?? 0, (skip ?? 0) + limit);
}

function buildSingleOccurrenceForSeries(eventSeries: OccurrenceQuerySeries): EventOccurrence {
  const occurrenceKey = EventOccurrenceService.buildOccurrenceKey(
    eventSeries.eventId,
    eventSeries.primarySchedule.startAt,
  );
  const fallbackTimestamp = new Date(eventSeries.primarySchedule.startAt);

  return {
    occurrenceId: occurrenceKey,
    eventSeriesId: eventSeries.eventId,
    eventSeriesSlug: eventSeries.slug,
    occurrenceKey,
    originalStartAt: new Date(eventSeries.primarySchedule.startAt),
    startAt: new Date(eventSeries.primarySchedule.startAt),
    endAt: eventSeries.primarySchedule.endAt ? new Date(eventSeries.primarySchedule.endAt) : undefined,
    timezone: eventSeries.primarySchedule.timezone,
    status: mapOccurrenceStatus(eventSeries.status),
    isException: false,
    seriesScheduleVersion: eventSeries.scheduleVersion ?? 1,
    createdAt: eventSeries.createdAt ? new Date(eventSeries.createdAt) : fallbackTimestamp,
    updatedAt: eventSeries.updatedAt ? new Date(eventSeries.updatedAt) : fallbackTimestamp,
  };
}

function warnIfQueryExceedsMaterializationWindow(hasRecurringCandidates: boolean, endDate: Date): void {
  if (!hasRecurringCandidates) {
    return;
  }

  const materializationWindowEnd = buildWindowEnd(new Date());
  if (endDate.getTime() <= materializationWindowEnd.getTime()) {
    return;
  }

  logger.warn('Occurrence query exceeds the current recurring materialization window.', {
    requestedEndDate: endDate,
    materializationWindowEnd,
  });
}

class EventOccurrenceService {
  private static groupOccurrencesBySeriesId(occurrences: EventOccurrence[]): Map<string, EventOccurrence[]> {
    const occurrencesBySeriesId = new Map<string, EventOccurrence[]>();

    for (const occurrence of occurrences) {
      const seriesOccurrences = occurrencesBySeriesId.get(occurrence.eventSeriesId) ?? [];
      seriesOccurrences.push(occurrence);
      occurrencesBySeriesId.set(occurrence.eventSeriesId, seriesOccurrences);
    }

    return occurrencesBySeriesId;
  }

  static async readRepresentativeOccurrencesForSeriesIds(
    eventSeriesIds: string[],
    fromDate: Date = new Date(),
  ): Promise<Map<string, EventOccurrence | null>> {
    const occurrencesBySeriesId = this.groupOccurrencesBySeriesId(
      await EventOccurrenceDAO.readByEventSeriesIds(eventSeriesIds),
    );

    return new Map(
      eventSeriesIds.map((eventSeriesId) => [
        eventSeriesId,
        pickRepresentativeOccurrence(occurrencesBySeriesId.get(eventSeriesId) ?? [], fromDate),
      ]),
    );
  }

  static buildOccurrenceKey(eventSeriesId: string, originalStartAt: Date): string {
    return `${eventSeriesId}#${originalStartAt.toISOString()}`;
  }

  static async readOccurrenceById(occurrenceId: string): Promise<EventOccurrence | null> {
    return EventOccurrenceDAO.readByOccurrenceId(occurrenceId);
  }

  static async readSingleOccurrenceForSeries(eventSeriesId: string): Promise<EventOccurrence | null> {
    return EventOccurrenceDAO.readFirstByEventSeriesId(eventSeriesId);
  }

  static async readRepresentativeOccurrenceForSeries(
    eventSeriesId: string,
    fromDate: Date = new Date(),
  ): Promise<EventOccurrence | null> {
    const occurrencesBySeriesId = this.groupOccurrencesBySeriesId(
      await EventOccurrenceDAO.readByEventSeriesIds([eventSeriesId]),
    );
    return pickRepresentativeOccurrence(occurrencesBySeriesId.get(eventSeriesId) ?? [], fromDate);
  }

  static async deleteOccurrencesForSeries(eventSeriesId: string): Promise<void> {
    await EventOccurrenceDAO.deleteByEventSeriesId(eventSeriesId);
  }

  static async readRecurringOccurrenceContext(
    occurrenceId: string,
  ): Promise<{ occurrence: EventOccurrence; eventSeries: EventSeries }> {
    const occurrence = await EventOccurrenceDAO.readByOccurrenceId(occurrenceId);
    if (!occurrence) {
      throw CustomError(`Occurrence not found for id ${occurrenceId}`, ErrorTypes.NOT_FOUND);
    }

    const eventSeries = await EventSeriesDAO.readEventById(occurrence.eventSeriesId);
    if (!this.isRecurringSeries(eventSeries)) {
      throw CustomError(
        'Occurrence exceptions are only supported for recurring event series in this phase.',
        ErrorTypes.BAD_REQUEST,
      );
    }

    return { occurrence, eventSeries };
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
    eventSeries: Pick<EventSeries, 'eventId' | 'slug' | 'primarySchedule' | 'status' | 'scheduleVersion'>,
    now: Date = new Date(),
  ): EventOccurrence[] {
    if (!eventSeries.primarySchedule) {
      return [];
    }

    if (!this.isRecurringSeries(eventSeries)) {
      return [
        buildSingleOccurrenceForSeries({
          ...eventSeries,
        }),
      ];
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
        eventSeriesSlug: eventSeries.slug,
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

  static async readEventOccurrences(options: EventsQueryOptionsInput): Promise<EventOccurrence[]> {
    const { startDate, endDate } = resolveOccurrenceDateRange(options);
    const candidateEventSeries = (await EventSeriesDAO.readCandidateEventSeriesForOccurrences(
      options,
    )) as OccurrenceQuerySeries[];
    const eventSeriesIds = candidateEventSeries.map((eventSeries) => eventSeries.eventId);
    const occurrences =
      eventSeriesIds.length > 0
        ? await EventOccurrenceDAO.readByEventSeriesIdsInRange(eventSeriesIds, startDate, endDate)
        : [];

    warnIfQueryExceedsMaterializationWindow(
      candidateEventSeries.some((eventSeries) => this.isRecurringSeries(eventSeries)),
      endDate,
    );

    return paginateOccurrences(sortOccurrences(occurrences, options.sort), options);
  }

  static async readUpcomingOccurrencesForSeries(
    eventSeries: OccurrenceQuerySeries,
    limit: number = 5,
    fromDate: Date = new Date(),
  ): Promise<EventOccurrence[]> {
    const safeLimit = sanitizeQueryLimit(limit, 5);
    return EventOccurrenceDAO.readUpcomingByEventSeriesId(eventSeries.eventId, fromDate, safeLimit);
  }

  static async syncEventSeriesOccurrences(
    eventSeries: Pick<EventSeries, 'eventId' | 'slug' | 'primarySchedule' | 'status' | 'scheduleVersion'>,
  ): Promise<void> {
    const occurrences = this.buildOccurrencesForSeries(eventSeries);
    const exceptionOccurrenceKeys = new Set(
      await EventOccurrenceDAO.readExceptionOccurrenceKeysByEventSeriesId(eventSeries.eventId),
    );
    const generatedOccurrencesWithoutExceptions = occurrences.filter(
      (occurrence) => !exceptionOccurrenceKeys.has(occurrence.occurrenceKey),
    );

    if (generatedOccurrencesWithoutExceptions.length > 0) {
      await EventOccurrenceDAO.bulkUpsert(generatedOccurrencesWithoutExceptions);
    }
    // An empty generated set means this recurring series currently has no dates
    // inside the rolling materialization window, so stale generated rows should
    // be cleared rather than preserved indefinitely.
    await EventOccurrenceDAO.deleteMissingGeneratedOccurrences(
      eventSeries.eventId,
      occurrences.map((occurrence) => occurrence.occurrenceKey),
    );
  }

  static async updateOccurrenceException(input: UpdateEventOccurrenceInput): Promise<EventOccurrence> {
    const { occurrence, eventSeries } = await this.readRecurringOccurrenceContext(input.occurrenceId);

    if (
      eventSeries.status === EventStatus.Cancelled ||
      occurrence.status === EventOccurrenceStatus.Cancelled ||
      occurrence.status === EventOccurrenceStatus.Completed
    ) {
      throw CustomError('This occurrence cannot be edited in its current state.', ErrorTypes.BAD_REQUEST);
    }

    const nextStartAt = input.startAt != null ? new Date(input.startAt) : new Date(occurrence.startAt);
    const nextEndAt =
      input.endAt !== undefined
        ? input.endAt === null
          ? undefined
          : new Date(input.endAt)
        : occurrence.endAt
          ? new Date(occurrence.endAt)
          : undefined;
    const nextTimezone = input.timezone ?? occurrence.timezone;

    if (nextEndAt && nextEndAt.getTime() < nextStartAt.getTime()) {
      throw CustomError('Occurrence endAt must be later than or equal to startAt.', ErrorTypes.BAD_REQUEST);
    }

    const updatedOccurrence = await EventOccurrenceDAO.updateException(occurrence.occurrenceId, {
      ...occurrence,
      startAt: nextStartAt,
      endAt: nextEndAt,
      timezone: nextTimezone,
    });

    if (!updatedOccurrence) {
      throw CustomError(`Occurrence not found for id ${occurrence.occurrenceId}`, ErrorTypes.NOT_FOUND);
    }

    return updatedOccurrence;
  }

  static async cancelOccurrence(occurrenceId: string): Promise<EventOccurrence> {
    const { occurrence, eventSeries } = await this.readRecurringOccurrenceContext(occurrenceId);

    if (eventSeries.status === EventStatus.Cancelled || occurrence.status === EventOccurrenceStatus.Completed) {
      throw CustomError('This occurrence cannot be cancelled in its current state.', ErrorTypes.BAD_REQUEST);
    }

    const cancelledOccurrence = await EventOccurrenceDAO.cancelOccurrence(occurrenceId);
    if (!cancelledOccurrence) {
      throw CustomError(`Occurrence not found for id ${occurrenceId}`, ErrorTypes.NOT_FOUND);
    }

    await Promise.all([
      EventOccurrenceParticipantDAO.cancelAllByOccurrence(occurrenceId),
      EventOccurrenceDAO.clearReservedSlotCount(occurrenceId),
    ]);

    return cancelledOccurrence;
  }

  static async deleteFutureExceptionOccurrences(eventSeriesId: string, fromOriginalStartAt: Date): Promise<void> {
    const futureOccurrences = await EventOccurrenceDAO.readByEventSeriesIdFromOriginalStart(
      eventSeriesId,
      fromOriginalStartAt,
    );
    const futureExceptionOccurrences = futureOccurrences.filter((occurrence) => occurrence.isException);

    if (futureExceptionOccurrences.length === 0) {
      return;
    }

    const occurrenceIds = futureExceptionOccurrences.map((occurrence) => occurrence.occurrenceId);
    await Promise.all([
      EventOccurrenceParticipantDAO.deleteByOccurrenceIds(occurrenceIds),
      EventOccurrenceDAO.deleteByOccurrenceIds(occurrenceIds),
    ]);
  }

  static async moveFutureOccurrencesToSeries(
    sourceEventSeriesId: string,
    successorEventSeriesId: string,
    successorEventSeriesSlug: string,
    fromOriginalStartAt: Date,
    successorScheduleVersion: number,
  ): Promise<void> {
    const futureOccurrences = await EventOccurrenceDAO.readByEventSeriesIdFromOriginalStart(
      sourceEventSeriesId,
      fromOriginalStartAt,
    );

    if (futureOccurrences.length === 0) {
      return;
    }

    await EventOccurrenceParticipantDAO.reassignOccurrenceIds(
      futureOccurrences.map((occurrence) => ({
        oldOccurrenceId: occurrence.occurrenceId,
        newOccurrenceId: this.buildOccurrenceKey(successorEventSeriesId, occurrence.originalStartAt),
      })),
    );

    await EventOccurrenceDAO.reassignOccurrencesToSeries(
      futureOccurrences.map((occurrence) => ({
        oldOccurrenceId: occurrence.occurrenceId,
        occurrenceId: this.buildOccurrenceKey(successorEventSeriesId, occurrence.originalStartAt),
        eventSeriesId: successorEventSeriesId,
        eventSeriesSlug: successorEventSeriesSlug,
        occurrenceKey: this.buildOccurrenceKey(successorEventSeriesId, occurrence.originalStartAt),
        seriesScheduleVersion: successorScheduleVersion,
      })),
    );
  }

  static splitRecurringRuleAtOccurrence(
    rruleString: string,
    pivotStartAt: Date,
  ): { predecessorRule: string; successorRule: string } {
    return splitRecurringRuleAtOccurrence(rruleString, pivotStartAt);
  }
}

export default EventOccurrenceService;
