import {RRuleSet, rrulestr} from 'rrule';
import {logger} from './logger';
import {DATE_FILTER_OPTIONS, type DateFilterOption} from '@ntlango/commons';

/**
 * Parse an RRULE string and return occurrences within a date range
 */
export function getOccurrencesInRange(
  rruleString: string,
  startDate: Date,
  endDate: Date,
  maxOccurrences: number = 100
): Date[] {
  try {
    // Parse the RRULE string
    const rule = rrulestr(rruleString, {forceset: true}) as RRuleSet;
    
    // Get occurrences between the date range
    const occurrences = rule.between(startDate, endDate, true);
    
    // Limit the number of occurrences to prevent performance issues
    return occurrences.slice(0, maxOccurrences);
  } catch (error) {
    logger.error('Error parsing RRULE string:', {rruleString, error});
    return [];
  }
}

/**
 * Check if an event (via its RRULE) has any occurrences within a date range
 */
export function hasOccurrenceInRange(
  rruleString: string,
  startDate: Date,
  endDate: Date
): boolean {
  const occurrences = getOccurrencesInRange(rruleString, startDate, endDate, 1);
  return occurrences.length > 0;
}

/**
 * Get the next occurrence of an event from a given date
 */
export function getNextOccurrence(rruleString: string, fromDate: Date = new Date()): Date | null {
  try {
    const rule = rrulestr(rruleString, {forceset: true}) as RRuleSet;
    const nextOccurrence = rule.after(fromDate, true);
    return nextOccurrence;
  } catch (error) {
    logger.error('Error getting next occurrence:', {rruleString, error});
    return null;
  }
}

/**
 * Parse date filter option and return appropriate date range
 */
export function getDateRangeForFilter(
  filterOption: DateFilterOption | typeof DATE_FILTER_OPTIONS.CUSTOM,
  customDate?: Date
): {startDate: Date; endDate: Date} {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  switch (filterOption) {
    case DATE_FILTER_OPTIONS.TODAY: {
      const start = new Date(now);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return {startDate: start, endDate: end};
    }

    case DATE_FILTER_OPTIONS.TOMORROW: {
      const start = new Date(now);
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return {startDate: start, endDate: end};
    }

    case DATE_FILTER_OPTIONS.THIS_WEEK: {
      const start = new Date(now);
      // Get to the start of the week (Sunday)
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // End of week (Saturday)
      end.setHours(23, 59, 59, 999);
      return {startDate: start, endDate: end};
    }

    case DATE_FILTER_OPTIONS.THIS_WEEKEND: {
      const start = new Date(now);
      const dayOfWeek = start.getDay();
      
      // If today is before Saturday, go to next Saturday
      if (dayOfWeek < 6) {
        start.setDate(start.getDate() + (6 - dayOfWeek));
      }
      // If today is Sunday (0), Saturday was yesterday
      else if (dayOfWeek === 0) {
        start.setDate(start.getDate() - 1);
      }
      
      const end = new Date(start);
      end.setDate(end.getDate() + 1); // Sunday
      end.setHours(23, 59, 59, 999);
      return {startDate: start, endDate: end};
    }

    case DATE_FILTER_OPTIONS.THIS_MONTH: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return {startDate: start, endDate: end};
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
      return {startDate: start, endDate: end};
    }

    default:
      throw new Error(`Unknown date filter option: ${filterOption}`);
  }
}
