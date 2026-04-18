import { RRule } from 'rrule';
import { logger } from './logger';

/**
 * Returns true if the recurrenceRule has at least one occurrence on or after now.
 * Pass event.primarySchedule.recurrenceRule as the argument.
 */
export function isEventUpcoming(recurrenceRule: string | null | undefined): boolean {
  if (!recurrenceRule) return true; // safe default: don't hide events with no rule
  try {
    const rule = RRule.fromString(recurrenceRule);
    return rule.after(new Date(), true) !== null;
  } catch {
    logger.warn('[rrule] Failed to parse recurrenceRule:', recurrenceRule);
    return true;
  }
}
