import { RRule } from 'rrule';
import { logger } from './logger';

export function normalizeRecurrenceRule(recurrenceRule: string): string {
  const lines = recurrenceRule
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const ruleLine = lines.find((line) => line.toUpperCase().startsWith('RRULE:'));
  const normalized = ruleLine ? ruleLine.slice('RRULE:'.length) : recurrenceRule.trim();

  return normalized.replace(/^RRULE:/i, '').trim();
}

export function buildScheduleRuleString(anchorStartAt: string | Date, recurrenceRule: string): string {
  const anchor = anchorStartAt instanceof Date ? anchorStartAt : new Date(anchorStartAt);
  const dtstart = anchor
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  return `DTSTART:${dtstart}\nRRULE:${normalizeRecurrenceRule(recurrenceRule)}`;
}

/**
 * Returns true if the recurrenceRule has at least one occurrence on or after now.
 * Pass event.primarySchedule.anchorStartAt + event.primarySchedule.recurrenceRule.
 */
export function isEventUpcoming(
  anchorStartAt: string | Date | null | undefined,
  recurrenceRule: string | null | undefined,
): boolean {
  if (!anchorStartAt) return true; // safe default: don't hide events with incomplete schedule data

  if (!recurrenceRule && typeof anchorStartAt === 'string') {
    try {
      const lines = anchorStartAt
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const dtstartLine = lines.find((line) => line.toUpperCase().startsWith('DTSTART:'));
      const embeddedRuleLine = lines.find((line) => line.toUpperCase().startsWith('RRULE:'));

      if (dtstartLine) {
        const normalizedAnchor = dtstartLine
          .slice('DTSTART:'.length)
          .trim()
          .replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6.000Z');
        const rule = RRule.fromString(buildScheduleRuleString(new Date(normalizedAnchor), anchorStartAt));
        return rule.after(new Date(), true) !== null;
      }

      if (embeddedRuleLine || /^FREQ=/i.test(anchorStartAt.trim())) {
        logger.warn('[rrule] Missing DTSTART for embedded recurrenceRule:', anchorStartAt);
        return true;
      }

      const rule = RRule.fromString(anchorStartAt);
      return rule.after(new Date(), true) !== null;
    } catch {
      logger.warn('[rrule] Failed to parse recurrenceRule:', anchorStartAt);
      return true;
    }
  }

  if (!recurrenceRule) return true;

  try {
    const rule = RRule.fromString(buildScheduleRuleString(anchorStartAt, recurrenceRule));
    return rule.after(new Date(), true) !== null;
  } catch {
    logger.warn('[rrule] Failed to parse recurrenceRule:', recurrenceRule);
    return true;
  }
}
