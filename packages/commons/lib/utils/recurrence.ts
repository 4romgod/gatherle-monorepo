export const SINGLE_EVENT_RECURRENCE_RULE = 'FREQ=DAILY;COUNT=1';

export const EVENT_RECURRENCE_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export const EVENT_RECURRENCE_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

export type EventRecurrenceFrequency = (typeof EVENT_RECURRENCE_FREQUENCIES)[number];
export type EventRecurrenceWeekday = (typeof EVENT_RECURRENCE_WEEKDAYS)[number];
export type EventRecurrenceKind = 'single' | 'recurring';

export type ParsedEventRecurrenceRule = {
  daysOfWeek: EventRecurrenceWeekday[];
  frequency: EventRecurrenceFrequency;
  interval: number;
  kind: EventRecurrenceKind;
  untilToken: string | null;
};

type BuildEventRecurrenceRuleInput = {
  daysOfWeek?: readonly EventRecurrenceWeekday[];
  frequency: EventRecurrenceFrequency;
  interval?: number;
  kind: EventRecurrenceKind;
  untilToken?: string | null;
};

const RRULE_LINE_PREFIX = 'RRULE:';
const UNTIL_TOKEN_REGEX = /^(\d{8})(?:T(\d{6})Z?)?$/;

export function normalizeRecurrenceInterval(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

export function parseEventRecurrenceRule(rule: string | null | undefined): ParsedEventRecurrenceRule {
  const rruleBody = extractRRuleBody(rule);
  if (!rruleBody) {
    return {
      daysOfWeek: [],
      frequency: 'DAILY',
      interval: 1,
      kind: 'single',
      untilToken: null,
    };
  }

  const parts = new Map<string, string>();
  rruleBody.split(';').forEach((segment) => {
    const [rawKey, rawValue] = segment.split('=');
    const key = rawKey?.trim().toUpperCase();
    const value = rawValue?.trim();

    if (key && value) {
      parts.set(key, value);
    }
  });

  const frequency = isRecurrenceFrequency(parts.get('FREQ'))
    ? (parts.get('FREQ') as EventRecurrenceFrequency)
    : 'DAILY';
  const interval = normalizeRecurrenceInterval(parts.get('INTERVAL'));
  const daysOfWeek = (parts.get('BYDAY') ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(isRecurrenceWeekday);
  const untilToken = normalizeUntilToken(parts.get('UNTIL'));
  const count = Number.parseInt(parts.get('COUNT') ?? '', 10);

  return {
    daysOfWeek,
    frequency,
    interval,
    kind: count === 1 ? 'single' : 'recurring',
    untilToken,
  };
}

export function buildEventRecurrenceRule({
  daysOfWeek = [],
  frequency,
  interval,
  kind,
  untilToken,
}: BuildEventRecurrenceRuleInput) {
  if (kind === 'single') {
    return SINGLE_EVENT_RECURRENCE_RULE;
  }

  const normalizedInterval = normalizeRecurrenceInterval(interval);
  const normalizedUntilToken = normalizeUntilToken(untilToken);
  const parts = [`FREQ=${frequency}`];

  if (normalizedInterval > 1) {
    parts.push(`INTERVAL=${normalizedInterval}`);
  }

  if (frequency === 'WEEKLY') {
    const uniqueDays = Array.from(new Set(daysOfWeek.filter(isRecurrenceWeekday)));
    if (uniqueDays.length > 0) {
      parts.push(`BYDAY=${uniqueDays.join(',')}`);
    }
  }

  if (normalizedUntilToken) {
    parts.push(`UNTIL=${normalizedUntilToken}`);
  }

  return parts.join(';');
}

export function formatRRuleUntilToken(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const iso = date.toISOString();
  return (
    iso.slice(0, 4) +
    iso.slice(5, 7) +
    iso.slice(8, 10) +
    'T' +
    iso.slice(11, 13) +
    iso.slice(14, 16) +
    iso.slice(17, 19) +
    'Z'
  );
}

export function parseRRuleUntilToken(value: string | null | undefined) {
  const token = normalizeUntilToken(value);
  if (!token) {
    return null;
  }

  const match = UNTIL_TOKEN_REGEX.exec(token);
  if (!match) {
    return null;
  }

  const datePart = match[1];
  const timePart = match[2] ?? '000000';

  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6));
  const day = Number(datePart.slice(6, 8));
  const hour = Number(timePart.slice(0, 2));
  const minute = Number(timePart.slice(2, 4));
  const second = Number(timePart.slice(4, 6));

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function extractRRuleBody(rule: string | null | undefined) {
  const trimmed = rule?.trim();
  if (!trimmed) {
    return '';
  }

  const rruleLine = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toUpperCase().startsWith(RRULE_LINE_PREFIX));

  if (rruleLine) {
    return rruleLine.slice(RRULE_LINE_PREFIX.length).trim();
  }

  return trimmed.replace(/^RRULE:/i, '').trim();
}

function normalizeUntilToken(value: string | null | undefined) {
  const trimmed = value?.trim().toUpperCase();
  if (!trimmed || !UNTIL_TOKEN_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function isRecurrenceFrequency(value: string | undefined) {
  return EVENT_RECURRENCE_FREQUENCIES.includes(value as EventRecurrenceFrequency);
}

function isRecurrenceWeekday(value: string): value is EventRecurrenceWeekday {
  return EVENT_RECURRENCE_WEEKDAYS.includes(value as EventRecurrenceWeekday);
}
