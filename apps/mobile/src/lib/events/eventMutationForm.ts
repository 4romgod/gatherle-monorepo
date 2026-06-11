import {
  EVENT_RECURRENCE_FREQUENCIES,
  EVENT_RECURRENCE_WEEKDAYS,
  type EventRecurrenceFrequency,
  type EventRecurrenceKind,
  type EventRecurrenceWeekday,
} from '@gatherle/commons/client/utils';

export const COMMON_EVENT_TIMEZONES = [
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
] as const;

export const MOBILE_EVENT_RECURRENCE_FREQUENCY_LABELS: Record<EventRecurrenceFrequency, string> = {
  DAILY: 'Daily',
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
  YEARLY: 'Yearly',
};

export const MOBILE_EVENT_RECURRENCE_WEEKDAY_LABELS: Record<EventRecurrenceWeekday, string> = {
  FR: 'Fri',
  MO: 'Mon',
  SA: 'Sat',
  SU: 'Sun',
  TH: 'Thu',
  TU: 'Tue',
  WE: 'Wed',
};

export type MobileEventRecurrenceState = {
  daysOfWeek: EventRecurrenceWeekday[];
  frequency: EventRecurrenceFrequency;
  interval: string;
  kind: EventRecurrenceKind;
  repeatUntilDate: string;
};

export const initialMobileEventRecurrenceState: MobileEventRecurrenceState = {
  daysOfWeek: [],
  frequency: 'WEEKLY',
  interval: '1',
  kind: 'single',
  repeatUntilDate: '',
};

export const MOBILE_EVENT_RECURRENCE_FREQUENCY_OPTIONS = EVENT_RECURRENCE_FREQUENCIES;
export const MOBILE_EVENT_RECURRENCE_WEEKDAY_OPTIONS = EVENT_RECURRENCE_WEEKDAYS;

export function getRecurrenceIntervalHelperText(frequency: EventRecurrenceFrequency, intervalValue: string) {
  const interval = Number.parseInt(intervalValue, 10);
  const normalizedInterval = Number.isFinite(interval) && interval > 0 ? interval : 1;
  const singularUnit =
    frequency === 'DAILY' ? 'day' : frequency === 'WEEKLY' ? 'week' : frequency === 'MONTHLY' ? 'month' : 'year';

  if (normalizedInterval === 1) {
    return `Repeats every ${singularUnit}.`;
  }

  const unit =
    frequency === 'DAILY' ? 'days' : frequency === 'WEEKLY' ? 'weeks' : frequency === 'MONTHLY' ? 'months' : 'years';

  return `Repeats every ${normalizedInterval} ${unit}.`;
}

export function getWeekdayFromDateInput(dateValue: string): EventRecurrenceWeekday | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return MOBILE_EVENT_RECURRENCE_WEEKDAY_OPTIONS[date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1] ?? null;
}

export function ensureWeeklyRecurrenceDays(
  daysOfWeek: readonly EventRecurrenceWeekday[],
  dateValue: string,
): EventRecurrenceWeekday[] {
  if (daysOfWeek.length > 0) {
    return Array.from(new Set(daysOfWeek));
  }

  const weekday = getWeekdayFromDateInput(dateValue);
  return weekday ? [weekday] : [];
}
