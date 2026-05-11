import { RRule } from 'rrule';
import { upperFirst } from 'lodash';
import { logger } from '@/lib/utils';
import { normalizeRecurrenceRule } from '@/lib/utils/rrule';

export const formatRecurrenceRule = (rule?: string | null): string => {
  if (!rule) {
    return 'Schedule coming soon';
  }

  try {
    return upperFirst(RRule.fromString(normalizeRecurrenceRule(rule)).toText());
  } catch (error) {
    logger.error('Unable to parse recurrence rule', error);
    return 'Schedule coming soon';
  }
};

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatOccurrenceDateTime = (
  startAt?: string | Date | null,
  endAt?: string | Date | null,
  timezone?: string | null,
): string => {
  const start = toDate(startAt);
  if (!start) {
    return 'Date to be confirmed';
  }

  const end = toDate(endAt);
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: timezone ?? undefined,
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone ?? undefined,
  });

  const dateLabel = dateFormatter.format(start);
  const startLabel = timeFormatter.format(start);
  const endLabel = end ? timeFormatter.format(end) : null;

  return endLabel ? `${dateLabel} · ${startLabel} - ${endLabel}` : `${dateLabel} · ${startLabel}`;
};

export const formatOccurrenceChipLabel = (startAt?: string | Date | null, timezone?: string | null): string => {
  const start = toDate(startAt);
  if (!start) {
    return 'TBD';
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone ?? undefined,
  }).format(start);
};
