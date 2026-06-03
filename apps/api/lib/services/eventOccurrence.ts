import { RRule } from 'rrule';
import { EventOccurrenceDAO, EventOccurrenceParticipantDAO, EventSeriesDAO } from '@/mongodb/dao';
import {
  CustomError,
  ErrorTypes,
  getDateRangeForFilter,
  getOccurrencesInRange,
  getOccurrencesInRangeOrThrow,
  getScheduleAnchorStartAt,
  getScheduleDurationMinutes,
  getScheduleEndAt,
  normalizeRecurrenceRule,
  pickRepresentativeOccurrence,
  resolveEventStatusFromOccurrence,
  resolveOccurrenceLifecycleStatus,
  splitRecurringRuleAtOccurrence,
} from '@/utils';
import type {
  EventOccurrence,
  EventSeries,
  EventsQueryOptionsInput,
  FilterInput,
  QueryOptionsInput,
  UpdateEventOccurrenceInput,
  SortInput,
} from '@gatherle/commons/types';
import { FilterOperatorInput, SelectorOperatorInput, SortOrderInput } from '@gatherle/commons/types';
import { EventOccurrenceStatus, EventStatus } from '@gatherle/commons/types';
import { DATE_FILTER_OPTIONS } from '@gatherle/commons';
import { sanitizeQueryLimit, validatePaginationInput } from '@/utils';
import { logger } from '@/utils/logger';

/** Maximum look-ahead window for materialising occurrence rows. Balances pre-computation cost with enough runway for schedulers and calendar integrations. */
const MATERIALIZATION_WINDOW_MONTHS = 12;
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

export type EventOccurrenceQueryRequestCache = {
  candidateSeriesByOptionsKey: Map<string, OccurrenceQuerySeries[]>;
  occurrencesByRangeKey: Map<string, EventOccurrence[]>;
};

export const createEventOccurrenceQueryRequestCache = (): EventOccurrenceQueryRequestCache => ({
  candidateSeriesByOptionsKey: new Map(),
  occurrencesByRangeKey: new Map(),
});

const DEFAULT_OCCURRENCE_SORT: SortInput[] = [{ field: 'startAt', order: SortOrderInput.asc }];
const SUPPORTED_OCCURRENCE_SORT_FIELDS = new Set([
  'createdAt',
  'endAt',
  'eventSeriesId',
  'occurrenceId',
  'occurrenceKey',
  'originalStartAt',
  'rsvpCount',
  'seriesScheduleVersion',
  'startAt',
  'status',
  'timezone',
  'updatedAt',
]);
const SUPPORTED_USER_OCCURRENCE_SORT_FIELDS = new Set(['startAt']);

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (value instanceof Date) {
    return `Date(${value.toISOString()})`;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries.map(([key, nestedValue]) => `${key}:${stableSerialize(nestedValue)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function parseRule(rruleString: string): RRule | null {
  try {
    return RRule.fromString(normalizeRecurrenceRule(rruleString));
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

function buildScheduleEndAt(anchorStartAt: Date, durationMs: number): Date | undefined {
  if (durationMs <= 0) {
    return undefined;
  }

  return new Date(anchorStartAt.getTime() + durationMs);
}

function buildWindowEnd(now: Date): Date {
  const windowEnd = new Date(now);
  windowEnd.setMonth(windowEnd.getMonth() + MATERIALIZATION_WINDOW_MONTHS);
  return windowEnd;
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
  const sortInput = getOccurrenceSortInput(sort);

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

function occurrenceSortRequiresRsvpCount(sort?: SortInput[]): boolean {
  const sortInput = getOccurrenceSortInput(sort);
  return sortInput.some((sortEntry) => sortEntry.field === 'rsvpCount');
}

function getOccurrenceSortInput(sort?: SortInput[]): SortInput[] {
  const sortInput = sort && sort.length > 0 ? sort : DEFAULT_OCCURRENCE_SORT;

  for (const sortEntry of sortInput) {
    if (!SUPPORTED_OCCURRENCE_SORT_FIELDS.has(sortEntry.field)) {
      throw CustomError(
        `Occurrence sorting only supports: ${Array.from(SUPPORTED_OCCURRENCE_SORT_FIELDS).sort().join(', ')}.`,
        ErrorTypes.BAD_REQUEST,
      );
    }
  }

  return sortInput;
}

function paginateOccurrences(occurrences: EventOccurrence[], options?: EventsQueryOptionsInput): EventOccurrence[] {
  if (!options?.pagination) {
    return occurrences;
  }

  const { skip, limit } = validatePaginationInput(options.pagination);
  return occurrences.slice(skip ?? 0, (skip ?? 0) + limit);
}

function getUserOccurrenceSortInput(sort?: QueryOptionsInput['sort']): { field: string; order: SortOrderInput }[] {
  const sortInput = sort && sort.length > 0 ? sort : [{ field: 'startAt', order: SortOrderInput.desc }];

  for (const sortEntry of sortInput) {
    if (!SUPPORTED_USER_OCCURRENCE_SORT_FIELDS.has(sortEntry.field)) {
      throw CustomError(
        `User occurrence sorting only supports: ${Array.from(SUPPORTED_USER_OCCURRENCE_SORT_FIELDS).sort().join(', ')}.`,
        ErrorTypes.BAD_REQUEST,
      );
    }
  }

  return sortInput.map((sortEntry) => ({
    field: sortEntry.field,
    order: sortEntry.order as SortOrderInput,
  }));
}

function buildSingleOccurrenceForSeries(eventSeries: OccurrenceQuerySeries): EventOccurrence {
  const anchorStartAt = getScheduleAnchorStartAt(eventSeries.primarySchedule);
  const durationMs = getScheduleDurationMinutes(eventSeries.primarySchedule) * 60 * 1000;
  const occurrenceKey = EventOccurrenceService.buildOccurrenceKey(eventSeries.eventId, anchorStartAt);
  const endAt = buildScheduleEndAt(anchorStartAt, durationMs);
  const fallbackTimestamp = new Date(anchorStartAt);

  return {
    occurrenceId: occurrenceKey,
    eventSeriesId: eventSeries.eventId,
    eventSeriesSlug: eventSeries.slug,
    occurrenceKey,
    originalStartAt: new Date(anchorStartAt),
    startAt: new Date(anchorStartAt),
    endAt,
    timezone: eventSeries.primarySchedule.timezone,
    status: resolveOccurrenceLifecycleStatus(
      {
        startAt: anchorStartAt,
        endAt,
      },
      eventSeries.status,
    ),
    isException: false,
    seriesScheduleVersion: eventSeries.scheduleVersion ?? 1,
    createdAt: eventSeries.createdAt ? new Date(eventSeries.createdAt) : fallbackTimestamp,
    updatedAt: eventSeries.updatedAt ? new Date(eventSeries.updatedAt) : fallbackTimestamp,
  };
}

function logIfQueryExceedsMaterializationWindow(hasRecurringCandidates: boolean, endDate: Date): void {
  if (!hasRecurringCandidates) {
    return;
  }

  const materializationWindowEnd = buildWindowEnd(new Date());
  if (endDate.getTime() <= materializationWindowEnd.getTime()) {
    return;
  }

  logger.debug('Occurrence query exceeds the current recurring materialization window.', {
    requestedEndDate: endDate,
    materializationWindowEnd,
  });
}

function normalizeEventStatusValues(value: FilterInput['value']): EventStatus[] {
  const validStatuses = new Set(Object.values(EventStatus));
  const rawValues = Array.isArray(value) ? value : [value];

  return rawValues.filter((entry): entry is EventStatus => validStatuses.has(entry as EventStatus));
}

function matchesDerivedStatusFilter(derivedStatus: EventStatus, filter: FilterInput): boolean {
  const values = normalizeEventStatusValues(filter.value);

  if (values.length === 0) {
    return true;
  }

  const matches = values.includes(derivedStatus);
  return filter.operator === FilterOperatorInput.ne ? !matches : matches;
}

function filterOccurrencesByDerivedStatus(
  occurrences: EventOccurrence[],
  statusFilters: FilterInput[],
  now: Date = new Date(),
): EventOccurrence[] {
  if (statusFilters.length === 0) {
    return occurrences;
  }

  const orFilters = statusFilters.filter((filter) => filter.selectorOperator === SelectorOperatorInput.or);
  const norFilters = statusFilters.filter((filter) => filter.selectorOperator === SelectorOperatorInput.nor);
  const andFilters = statusFilters.filter(
    (filter) =>
      filter.selectorOperator !== SelectorOperatorInput.or && filter.selectorOperator !== SelectorOperatorInput.nor,
  );

  return occurrences.filter((occurrence) => {
    const derivedStatus = resolveEventStatusFromOccurrence(occurrence, now);

    const matchesAnd = andFilters.every((filter) => matchesDerivedStatusFilter(derivedStatus, filter));
    const matchesOr =
      orFilters.length === 0 || orFilters.some((filter) => matchesDerivedStatusFilter(derivedStatus, filter));
    const matchesNor = norFilters.every((filter) => !matchesDerivedStatusFilter(derivedStatus, filter));

    return matchesAnd && matchesOr && matchesNor;
  });
}

function splitOccurrenceStatusFilters(options: EventsQueryOptionsInput) {
  const statusFilters = (options.filters ?? []).filter((filter) => filter.field === 'status');
  const remainingFilters = (options.filters ?? []).filter((filter) => filter.field !== 'status');

  return {
    statusFilters,
    seriesOptions:
      statusFilters.length === 0
        ? options
        : {
            ...options,
            filters: remainingFilters.length > 0 ? remainingFilters : undefined,
          },
  };
}

class EventOccurrenceService {
  private static async readCandidateEventSeriesForOccurrenceQuery(
    options: EventsQueryOptionsInput | undefined,
    requestCache?: EventOccurrenceQueryRequestCache,
  ): Promise<OccurrenceQuerySeries[]> {
    const cacheKey = stableSerialize(options ?? null);
    const cached = requestCache?.candidateSeriesByOptionsKey.get(cacheKey);
    if (cached) {
      return cached;
    }

    const candidateEventSeries = (await EventSeriesDAO.readCandidateEventSeriesForOccurrences(
      options,
    )) as OccurrenceQuerySeries[];

    requestCache?.candidateSeriesByOptionsKey.set(cacheKey, candidateEventSeries);
    return candidateEventSeries;
  }

  private static async readPersistedOccurrencesInRange(
    eventSeriesIds: string[],
    startDate: Date,
    endDate: Date,
    requestCache?: EventOccurrenceQueryRequestCache,
  ): Promise<EventOccurrence[]> {
    const cacheKey = stableSerialize({
      eventSeriesIds,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const cached = requestCache?.occurrencesByRangeKey.get(cacheKey);
    if (cached) {
      return cached;
    }

    const occurrences = await EventOccurrenceDAO.readByEventSeriesIdsInRange(eventSeriesIds, startDate, endDate);
    requestCache?.occurrencesByRangeKey.set(cacheKey, occurrences);
    return occurrences;
  }

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
    return EventOccurrenceDAO.readRepresentativeByEventSeriesIds(eventSeriesIds, fromDate);
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

  static async readUserEventOccurrences(
    userId: string,
    activeOnly = true,
    options?: QueryOptionsInput,
  ): Promise<EventOccurrence[]> {
    if (options?.search) {
      throw CustomError('User occurrence queries do not support text search.', ErrorTypes.BAD_REQUEST);
    }

    if (options?.filters?.length) {
      throw CustomError('User occurrence queries do not support generic filters yet.', ErrorTypes.BAD_REQUEST);
    }

    const [{ order: startAtOrder }] = getUserOccurrenceSortInput(options?.sort);
    const pagination = options?.pagination ? validatePaginationInput(options.pagination) : undefined;
    const orderedOccurrenceIds = await EventOccurrenceParticipantDAO.readOccurrenceIdsByUser(
      userId,
      activeOnly,
      startAtOrder === SortOrderInput.asc ? 1 : -1,
      pagination?.skip ?? 0,
      pagination?.limit,
    );

    if (orderedOccurrenceIds.length === 0) {
      return [];
    }

    const occurrences = await EventOccurrenceDAO.readByOccurrenceIds(orderedOccurrenceIds);
    const occurrenceMap = new Map(occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence]));

    return orderedOccurrenceIds
      .map((occurrenceId) => occurrenceMap.get(occurrenceId))
      .filter((occurrence): occurrence is EventOccurrence => Boolean(occurrence));
  }

  static async readOccurrenceForSeries(eventSeriesId: string, occurrenceId?: string): Promise<EventOccurrence | null> {
    if (!occurrenceId) {
      return this.readSingleOccurrenceForSeries(eventSeriesId);
    }

    const occurrence = await EventOccurrenceDAO.readByOccurrenceId(occurrenceId);
    if (!occurrence || occurrence.eventSeriesId !== eventSeriesId) {
      return null;
    }

    return occurrence;
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

    const anchorStartAt = getScheduleAnchorStartAt(schedule);
    const scheduleDurationMinutes = getScheduleDurationMinutes(schedule);
    const scheduleEndAt = getScheduleEndAt(schedule);

    const rule = parseRule(schedule.recurrenceRule);

    if (!rule) {
      return false;
    }

    if (rule.options.freq !== RRule.DAILY) {
      return true;
    }

    const singleEventSpanDays = countCalendarDaysInclusive(anchorStartAt, scheduleEndAt);

    if (typeof rule.options.count === 'number') {
      return rule.options.count > singleEventSpanDays;
    }

    const singleEventEnd = scheduleEndAt ?? anchorStartAt;
    if (rule.options.until instanceof Date && rule.options.until.getTime() <= singleEventEnd.getTime()) {
      return false;
    }

    const windowEnd = buildWindowEnd(anchorStartAt);
    const occurrenceCount = getOccurrencesInRange(
      anchorStartAt,
      schedule.recurrenceRule,
      anchorStartAt,
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
    const anchorStartAt = getScheduleAnchorStartAt(schedule);
    const durationMs = getScheduleDurationMinutes(schedule) * 60 * 1000;
    const windowStart = new Date(now.getTime() - durationMs);
    const windowEnd = buildWindowEnd(now);
    const originalStartTimes = getOccurrencesInRangeOrThrow(
      anchorStartAt,
      schedule.recurrenceRule,
      windowStart,
      windowEnd,
      MAX_WINDOW_OCCURRENCES,
    );
    const seriesScheduleVersion = eventSeries.scheduleVersion ?? 1;

    return originalStartTimes.map((originalStartAt) => {
      const occurrenceKey = this.buildOccurrenceKey(eventSeries.eventId, originalStartAt);
      const startAt = new Date(originalStartAt);
      const endAt = buildScheduleEndAt(startAt, durationMs);

      return {
        occurrenceId: occurrenceKey,
        eventSeriesId: eventSeries.eventId,
        eventSeriesSlug: eventSeries.slug,
        occurrenceKey,
        originalStartAt: new Date(originalStartAt),
        startAt,
        endAt,
        timezone: schedule.timezone,
        status: resolveOccurrenceLifecycleStatus(
          {
            startAt,
            endAt,
          },
          eventSeries.status,
          now,
        ),
        isException: false,
        seriesScheduleVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  }

  static async readEventOccurrences(
    options: EventsQueryOptionsInput,
    requestCache?: EventOccurrenceQueryRequestCache,
  ): Promise<EventOccurrence[]> {
    const { startDate, endDate } = resolveOccurrenceDateRange(options);
    const sortInput = getOccurrenceSortInput(options.sort);
    const { seriesOptions, statusFilters } = splitOccurrenceStatusFilters(options);
    const candidateEventSeries = await this.readCandidateEventSeriesForOccurrenceQuery(seriesOptions, requestCache);
    const eventSeriesIds = candidateEventSeries.map((eventSeries) => eventSeries.eventId);

    logIfQueryExceedsMaterializationWindow(
      candidateEventSeries.some((eventSeries) => this.isRecurringSeries(eventSeries)),
      endDate,
    );

    if (eventSeriesIds.length === 0) {
      return [];
    }

    if (!occurrenceSortRequiresRsvpCount(sortInput) && statusFilters.length === 0) {
      const pagination = options.pagination ? validatePaginationInput(options.pagination) : undefined;

      return EventOccurrenceDAO.readByEventSeriesIdsInRange(eventSeriesIds, startDate, endDate, {
        sort: sortInput,
        skip: pagination?.skip,
        limit: pagination?.limit,
      });
    }

    const persistedOccurrences = await this.readPersistedOccurrencesInRange(
      eventSeriesIds,
      startDate,
      endDate,
      requestCache,
    );
    const occurrences = filterOccurrencesByDerivedStatus(persistedOccurrences, statusFilters);
    const occurrencesWithSortFields =
      occurrences.length > 0 ? await this.attachOccurrenceRsvpCounts(occurrences) : occurrences;

    return paginateOccurrences(sortOccurrences(occurrencesWithSortFields, sortInput), options);
  }

  static async countEventOccurrences(
    options: EventsQueryOptionsInput,
    requestCache?: EventOccurrenceQueryRequestCache,
  ): Promise<number> {
    const { startDate, endDate } = resolveOccurrenceDateRange(options);
    const { seriesOptions, statusFilters } = splitOccurrenceStatusFilters(options);
    const candidateEventSeries = await this.readCandidateEventSeriesForOccurrenceQuery(seriesOptions, requestCache);
    const eventSeriesIds = candidateEventSeries.map((eventSeries) => eventSeries.eventId);

    logIfQueryExceedsMaterializationWindow(
      candidateEventSeries.some((eventSeries) => this.isRecurringSeries(eventSeries)),
      endDate,
    );

    if (eventSeriesIds.length === 0) {
      return 0;
    }

    if (statusFilters.length > 0) {
      return filterOccurrencesByDerivedStatus(
        await this.readPersistedOccurrencesInRange(eventSeriesIds, startDate, endDate, requestCache),
        statusFilters,
      ).length;
    }

    return EventOccurrenceDAO.countByEventSeriesIdsInRange(eventSeriesIds, startDate, endDate);
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

  private static async attachOccurrenceRsvpCounts(occurrences: EventOccurrence[]): Promise<EventOccurrence[]> {
    const rsvpCountsByOccurrenceId = await EventOccurrenceParticipantDAO.readActiveCountsByOccurrences(
      occurrences.map((occurrence) => occurrence.occurrenceId),
    );

    return occurrences.map((occurrence) => ({
      ...occurrence,
      rsvpCount: rsvpCountsByOccurrenceId.get(occurrence.occurrenceId) ?? 0,
    }));
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
    anchorStartAt: Date,
    recurrenceRule: string,
    pivotStartAt: Date,
  ): { predecessorRule: string; successorRule: string } {
    return splitRecurringRuleAtOccurrence(anchorStartAt, recurrenceRule, pivotStartAt);
  }
}

export default EventOccurrenceService;
