import { RRule, type Options, type RRuleSet } from 'rrule';
import { rrulestr } from 'rrule';
import { logger } from './logger';
import { DATE_FILTER_OPTIONS, type DateFilterOption } from '@gatherle/commons/server';

function toUtcDateTimeString(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function normalizeRecurrenceRule(recurrenceRule: string): string {
  const lines = recurrenceRule
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const ruleLine = lines.find((line) => line.toUpperCase().startsWith('RRULE:'));
  const normalized = ruleLine ? ruleLine.slice('RRULE:'.length) : recurrenceRule.trim();

  return normalized.replace(/^RRULE:/i, '').trim();
}

export function buildScheduleRuleString(anchorStartAt: Date, recurrenceRule: string): string {
  const normalizedRule = normalizeRecurrenceRule(recurrenceRule);
  return `DTSTART:${toUtcDateTimeString(anchorStartAt)}\nRRULE:${normalizedRule}`;
}

function parseAnchorFromRuleString(rruleString: string): Date {
  const dtstartLine = rruleString
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toUpperCase().startsWith('DTSTART:'));

  if (!dtstartLine) {
    throw new Error('Recurring rule must contain a valid DTSTART.');
  }

  const value = dtstartLine.slice('DTSTART:'.length).trim();
  const normalized = value.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6.000Z');
  const anchorStartAt = new Date(normalized);

  if (Number.isNaN(anchorStartAt.getTime())) {
    throw new Error('Recurring rule must contain a valid DTSTART.');
  }

  return anchorStartAt;
}

function resolveScheduleRuleArgs(
  anchorOrRule: Date | string,
  recurrenceRuleOrStartDate?: string | Date,
): { anchorStartAt: Date; recurrenceRule: string } {
  if (anchorOrRule instanceof Date && typeof recurrenceRuleOrStartDate === 'string') {
    return {
      anchorStartAt: anchorOrRule,
      recurrenceRule: recurrenceRuleOrStartDate,
    };
  }

  if (typeof anchorOrRule === 'string' && recurrenceRuleOrStartDate instanceof Date) {
    return {
      anchorStartAt: parseAnchorFromRuleString(anchorOrRule),
      recurrenceRule: anchorOrRule,
    };
  }

  if (typeof anchorOrRule === 'string' && recurrenceRuleOrStartDate === undefined) {
    return {
      anchorStartAt: parseAnchorFromRuleString(anchorOrRule),
      recurrenceRule: anchorOrRule,
    };
  }

  throw new Error('Invalid RRULE arguments.');
}

function parseRRuleSet(anchorStartAt: Date, recurrenceRule: string): RRuleSet {
  return rrulestr(buildScheduleRuleString(anchorStartAt, recurrenceRule), { forceset: true }) as RRuleSet;
}

function getPrimaryRule(anchorStartAt: Date, recurrenceRule: string) {
  const ruleSet = parseRRuleSet(anchorStartAt, recurrenceRule);
  const rules = ruleSet.rrules();

  if (rules.length !== 1) {
    throw new Error('Only single-rule recurring schedules are supported.');
  }

  return rules[0];
}

function buildRuleString(options: Partial<Options>): string {
  return RRule.optionsToString(options as Options);
}

function collectOccurrencesInRange(
  rule: Pick<RRuleSet, 'after'>,
  startDate: Date,
  endDate: Date,
  maxOccurrences: number,
): Date[] {
  const occurrences: Date[] = [];
  let nextOccurrence = rule.after(startDate, true);

  while (nextOccurrence && nextOccurrence <= endDate && occurrences.length < maxOccurrences) {
    occurrences.push(nextOccurrence);
    const followingOccurrence = rule.after(nextOccurrence, false);

    if (!followingOccurrence || followingOccurrence.getTime() === nextOccurrence.getTime()) {
      break;
    }

    nextOccurrence = followingOccurrence;
  }

  return occurrences;
}

/**
 * Parse an RRULE string and return occurrences within a date range
 */
export function getOccurrencesInRange(
  anchorStartAt: Date,
  recurrenceRule: string,
  startDate: Date,
  endDate: Date,
  maxOccurrences?: number,
): Date[];
export function getOccurrencesInRange(
  rruleString: string,
  startDate: Date,
  endDate: Date,
  maxOccurrences?: number,
): Date[];
export function getOccurrencesInRange(
  anchorOrRule: Date | string,
  recurrenceRuleOrStartDate: string | Date,
  startDateOrEndDate: Date,
  endDateOrMaxOccurrences?: Date | number,
  maybeMaxOccurrences: number = 100,
): Date[] {
  try {
    if (
      anchorOrRule instanceof Date &&
      typeof recurrenceRuleOrStartDate === 'string' &&
      endDateOrMaxOccurrences instanceof Date
    ) {
      return getOccurrencesInRangeOrThrow(
        anchorOrRule,
        recurrenceRuleOrStartDate,
        startDateOrEndDate,
        endDateOrMaxOccurrences,
        maybeMaxOccurrences,
      );
    }

    if (typeof anchorOrRule === 'string' && recurrenceRuleOrStartDate instanceof Date) {
      return getOccurrencesInRangeOrThrow(
        parseAnchorFromRuleString(anchorOrRule),
        anchorOrRule,
        recurrenceRuleOrStartDate,
        startDateOrEndDate,
        typeof endDateOrMaxOccurrences === 'number' ? endDateOrMaxOccurrences : 100,
      );
    }

    throw new Error('Invalid RRULE arguments.');
  } catch (error) {
    logger.error('Error parsing RRULE string:', { anchorOrRule, recurrenceRuleOrStartDate, error });
    return [];
  }
}

export function getOccurrencesInRangeOrThrow(
  anchorStartAt: Date,
  recurrenceRule: string,
  startDate: Date,
  endDate: Date,
  maxOccurrences?: number,
): Date[];
export function getOccurrencesInRangeOrThrow(
  rruleString: string,
  startDate: Date,
  endDate: Date,
  maxOccurrences?: number,
): Date[];
export function getOccurrencesInRangeOrThrow(
  anchorOrRule: Date | string,
  recurrenceRuleOrStartDate: string | Date,
  startDateOrEndDate: Date,
  endDateOrMaxOccurrences?: Date | number,
  maybeMaxOccurrences: number = 100,
): Date[] {
  if (
    anchorOrRule instanceof Date &&
    typeof recurrenceRuleOrStartDate === 'string' &&
    endDateOrMaxOccurrences instanceof Date
  ) {
    const rule = parseRRuleSet(anchorOrRule, recurrenceRuleOrStartDate);
    return collectOccurrencesInRange(rule, startDateOrEndDate, endDateOrMaxOccurrences, maybeMaxOccurrences);
  }

  if (typeof anchorOrRule === 'string' && recurrenceRuleOrStartDate instanceof Date) {
    const anchorStartAt = parseAnchorFromRuleString(anchorOrRule);
    const rule = parseRRuleSet(anchorStartAt, anchorOrRule);
    return collectOccurrencesInRange(
      rule,
      recurrenceRuleOrStartDate,
      startDateOrEndDate,
      typeof endDateOrMaxOccurrences === 'number' ? endDateOrMaxOccurrences : 100,
    );
  }

  throw new Error('Invalid RRULE arguments.');
}

/**
 * Check if an event (via its RRULE) has any occurrences within a date range
 */
export function hasOccurrenceInRange(
  anchorStartAt: Date,
  recurrenceRule: string,
  startDate: Date,
  endDate: Date,
): boolean;
export function hasOccurrenceInRange(rruleString: string, startDate: Date, endDate: Date): boolean;
export function hasOccurrenceInRange(
  anchorOrRule: Date | string,
  recurrenceRuleOrStartDate: string | Date,
  startDateOrEndDate: Date,
  endDate?: Date,
): boolean {
  const occurrences =
    anchorOrRule instanceof Date && typeof recurrenceRuleOrStartDate === 'string' && endDate
      ? getOccurrencesInRange(anchorOrRule, recurrenceRuleOrStartDate, startDateOrEndDate, endDate, 1)
      : getOccurrencesInRange(anchorOrRule as string, recurrenceRuleOrStartDate as Date, startDateOrEndDate, 1);
  return occurrences.length > 0;
}

/**
 * Get the next occurrence of an event from a given date
 */
export function getNextOccurrence(anchorStartAt: Date, recurrenceRule: string, fromDate?: Date): Date | null;
export function getNextOccurrence(rruleString: string, fromDate?: Date): Date | null;
export function getNextOccurrence(
  anchorOrRule: Date | string,
  recurrenceRuleOrFromDate?: string | Date,
  maybeFromDate: Date = new Date(),
): Date | null {
  try {
    const { anchorStartAt, recurrenceRule } = resolveScheduleRuleArgs(anchorOrRule, recurrenceRuleOrFromDate);
    const fromDate =
      anchorOrRule instanceof Date && typeof recurrenceRuleOrFromDate === 'string'
        ? maybeFromDate
        : ((recurrenceRuleOrFromDate as Date | undefined) ?? new Date());
    const rule = parseRRuleSet(anchorStartAt, recurrenceRule);
    const nextOccurrence = rule.after(fromDate, true);
    return nextOccurrence;
  } catch (error) {
    logger.error('Error getting next occurrence:', { anchorOrRule, recurrenceRuleOrFromDate, error });
    return null;
  }
}

export function splitRecurringRuleAtOccurrence(
  anchorStartAt: Date,
  recurrenceRule: string,
  pivotStartAt: Date,
): { predecessorRule: string; successorRule: string };
export function splitRecurringRuleAtOccurrence(
  rruleString: string,
  pivotStartAt: Date,
): { predecessorRule: string; successorRule: string };
export function splitRecurringRuleAtOccurrence(
  anchorOrRule: Date | string,
  recurrenceRuleOrPivotStartAt: string | Date,
  maybePivotStartAt?: Date,
): { predecessorRule: string; successorRule: string } {
  const legacyRuleString =
    typeof anchorOrRule === 'string' && recurrenceRuleOrPivotStartAt instanceof Date ? anchorOrRule : null;
  const { anchorStartAt, recurrenceRule } =
    anchorOrRule instanceof Date && typeof recurrenceRuleOrPivotStartAt === 'string'
      ? { anchorStartAt: anchorOrRule, recurrenceRule: recurrenceRuleOrPivotStartAt }
      : resolveScheduleRuleArgs(anchorOrRule, recurrenceRuleOrPivotStartAt as Date);
  const pivotStartAt =
    anchorOrRule instanceof Date && typeof recurrenceRuleOrPivotStartAt === 'string'
      ? (maybePivotStartAt as Date)
      : (recurrenceRuleOrPivotStartAt as Date);
  const primaryRule = getPrimaryRule(anchorStartAt, recurrenceRule);
  const originalOptions = { ...primaryRule.origOptions };

  const predecessorOptions: Partial<Options> = {
    ...originalOptions,
    until: new Date(pivotStartAt.getTime() - 1),
  };
  delete predecessorOptions.count;

  const successorOptions: Partial<Options> = {
    ...originalOptions,
    dtstart: new Date(pivotStartAt),
  };

  if (typeof originalOptions.count === 'number') {
    const occurrencesBeforeAndIncludingPivot = getOccurrencesInRangeOrThrow(
      anchorStartAt,
      recurrenceRule,
      anchorStartAt,
      pivotStartAt,
      originalOptions.count,
    ).length;
    const remainingCount = originalOptions.count - occurrencesBeforeAndIncludingPivot + 1;

    if (remainingCount < 1) {
      throw new Error('Split pivot must fall on or before the last occurrence in the recurring rule.');
    }

    successorOptions.count = remainingCount;
  }

  const predecessorRule = normalizeRecurrenceRule(buildRuleString(predecessorOptions));
  const successorRule = normalizeRecurrenceRule(buildRuleString(successorOptions));

  if (legacyRuleString) {
    return {
      predecessorRule: buildScheduleRuleString(anchorStartAt, predecessorRule),
      successorRule: buildScheduleRuleString(pivotStartAt, successorRule),
    };
  }

  return { predecessorRule, successorRule };
}

/**
 * Parse date filter option and return appropriate date range
 */
export function getDateRangeForFilter(
  filterOption: DateFilterOption | typeof DATE_FILTER_OPTIONS.CUSTOM,
  customDate?: Date,
): { startDate: Date; endDate: Date } {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  switch (filterOption) {
    case DATE_FILTER_OPTIONS.TODAY: {
      const start = new Date(now);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case DATE_FILTER_OPTIONS.TOMORROW: {
      const start = new Date(now);
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case DATE_FILTER_OPTIONS.THIS_WEEK: {
      const start = new Date(now);
      // Get to the start of the week (Sunday)
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);

      const end = new Date(start);
      end.setDate(end.getDate() + 6); // End of week (Saturday)
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case DATE_FILTER_OPTIONS.THIS_WEEKEND: {
      const start = new Date(now);
      const dayOfWeek = start.getDay();

      if (dayOfWeek === 0) {
        // Sunday: go to next Saturday (6 days forward)
        start.setDate(start.getDate() + 6);
      } else if (dayOfWeek === 6) {
        // Saturday: start today
        // (start is already set to now)
      } else {
        // Monday-Friday: go to upcoming Saturday
        start.setDate(start.getDate() + (6 - dayOfWeek));
      }

      const end = new Date(start);
      end.setDate(end.getDate() + 1); // Sunday
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case DATE_FILTER_OPTIONS.THIS_MONTH: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case DATE_FILTER_OPTIONS.CUSTOM: {
      // Internal case used when customDate is provided
      if (!customDate) {
        throw new Error('Custom date filter requires a customDate parameter');
      }
      const start = new Date(customDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customDate);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    default:
      throw new Error(`Unknown date filter option: ${filterOption}`);
  }
}
