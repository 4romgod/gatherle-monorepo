import { RRule, type Options, type RRuleSet } from 'rrule';
import { rrulestr } from 'rrule';
import { logger } from './logger';
import { DATE_FILTER_OPTIONS, type DateFilterOption } from '@gatherle/commons';

function parseRRuleSet(rruleString: string): RRuleSet {
  return rrulestr(rruleString, { forceset: true }) as RRuleSet;
}

function getPrimaryRule(rruleString: string) {
  const ruleSet = parseRRuleSet(rruleString);
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
  rruleString: string,
  startDate: Date,
  endDate: Date,
  maxOccurrences: number = 100,
): Date[] {
  try {
    return getOccurrencesInRangeOrThrow(rruleString, startDate, endDate, maxOccurrences);
  } catch (error) {
    logger.error('Error parsing RRULE string:', { rruleString, error });
    return [];
  }
}

export function getOccurrencesInRangeOrThrow(
  rruleString: string,
  startDate: Date,
  endDate: Date,
  maxOccurrences: number = 100,
): Date[] {
  const rule = parseRRuleSet(rruleString);
  return collectOccurrencesInRange(rule, startDate, endDate, maxOccurrences);
}

/**
 * Check if an event (via its RRULE) has any occurrences within a date range
 */
export function hasOccurrenceInRange(rruleString: string, startDate: Date, endDate: Date): boolean {
  const occurrences = getOccurrencesInRange(rruleString, startDate, endDate, 1);
  return occurrences.length > 0;
}

/**
 * Get the next occurrence of an event from a given date
 */
export function getNextOccurrence(rruleString: string, fromDate: Date = new Date()): Date | null {
  try {
    const rule = rrulestr(rruleString, { forceset: true }) as RRuleSet;
    const nextOccurrence = rule.after(fromDate, true);
    return nextOccurrence;
  } catch (error) {
    logger.error('Error getting next occurrence:', { rruleString, error });
    return null;
  }
}

export function splitRecurringRuleAtOccurrence(
  rruleString: string,
  pivotStartAt: Date,
): { predecessorRule: string; successorRule: string } {
  const primaryRule = getPrimaryRule(rruleString);
  const originalOptions = { ...primaryRule.origOptions };
  const originalStartAt = originalOptions.dtstart;

  if (!(originalStartAt instanceof Date) || Number.isNaN(originalStartAt.getTime())) {
    throw new Error('Recurring rule must contain a valid DTSTART.');
  }

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
      rruleString,
      originalStartAt,
      pivotStartAt,
      originalOptions.count,
    ).length;
    const remainingCount = originalOptions.count - occurrencesBeforeAndIncludingPivot + 1;

    if (remainingCount < 1) {
      throw new Error('Split pivot must fall on or before the last occurrence in the recurring rule.');
    }

    successorOptions.count = remainingCount;
  }

  return {
    predecessorRule: buildRuleString(predecessorOptions),
    successorRule: buildRuleString(successorOptions),
  };
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
