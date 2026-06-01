'use client';

import dayjs, { Dayjs } from 'dayjs';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';

export type EventsCalendarViewMode = 'list' | 'week' | 'month';

export interface OccurrenceCalendarRange {
  startDate: string;
  endDate: string;
}

const CALENDAR_DATE_KEY_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getCalendarDateKeyFormatter(timezone?: string | null) {
  const cacheKey = timezone ?? 'local';
  const cached = CALENDAR_DATE_KEY_FORMATTER_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone ?? undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  CALENDAR_DATE_KEY_FORMATTER_CACHE.set(cacheKey, formatter);
  return formatter;
}

function formatCalendarDateKey(date: Date, timezone?: string | null) {
  const parts = getCalendarDateKeyFormatter(timezone).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

export function coerceEventsCalendarViewMode(value?: string | null): EventsCalendarViewMode {
  if (value === 'week' || value === 'month') {
    return value;
  }

  return 'list';
}

export function resolveEventsCalendarAnchorDate(value?: string | null, fallback: Dayjs = dayjs()): Dayjs {
  if (!value) {
    return fallback.startOf('day');
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.startOf('day') : fallback.startOf('day');
}

export function buildOccurrenceCalendarRange(
  viewMode: Exclude<EventsCalendarViewMode, 'list'>,
  anchorDate: Dayjs,
): OccurrenceCalendarRange {
  const windowStart =
    viewMode === 'week' ? anchorDate.startOf('week').startOf('day') : anchorDate.startOf('month').startOf('week');
  const windowEnd =
    viewMode === 'week' ? anchorDate.endOf('week').endOf('day') : anchorDate.endOf('month').endOf('week');

  return {
    startDate: windowStart.toDate().toISOString(),
    endDate: windowEnd.toDate().toISOString(),
  };
}

export function buildOccurrenceCalendarLabel(
  viewMode: Exclude<EventsCalendarViewMode, 'list'>,
  anchorDate: Dayjs,
): string {
  if (viewMode === 'week') {
    const weekStart = anchorDate.startOf('week');
    const weekEnd = anchorDate.endOf('week');

    if (weekStart.isSame(weekEnd, 'month')) {
      return `${weekStart.format('MMM D')} - ${weekEnd.format('D, YYYY')}`;
    }

    if (weekStart.isSame(weekEnd, 'year')) {
      return `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`;
    }

    return `${weekStart.format('MMM D, YYYY')} - ${weekEnd.format('MMM D, YYYY')}`;
  }

  return anchorDate.format('MMMM YYYY');
}

export function shiftOccurrenceCalendarAnchor(
  viewMode: Exclude<EventsCalendarViewMode, 'list'>,
  anchorDate: Dayjs,
  direction: -1 | 1,
): Dayjs {
  return viewMode === 'week'
    ? anchorDate.add(direction, 'week').startOf('day')
    : anchorDate.add(direction, 'month').startOf('day');
}

export function buildWeekDays(anchorDate: Dayjs): Dayjs[] {
  const weekStart = anchorDate.startOf('week');
  return Array.from({ length: 7 }, (_, index) => weekStart.add(index, 'day'));
}

export function buildMonthGridDays(anchorDate: Dayjs): Dayjs[] {
  const gridStart = anchorDate.startOf('month').startOf('week');
  const gridEnd = anchorDate.endOf('month').endOf('week');
  const dayCount = gridEnd.diff(gridStart, 'day') + 1;

  return Array.from({ length: dayCount }, (_, index) => gridStart.add(index, 'day'));
}

export function getOccurrenceCalendarDayKey(occurrence: Pick<EventOccurrencePreview, 'startAt' | 'timezone'>): string {
  return formatCalendarDateKey(new Date(occurrence.startAt), occurrence.timezone);
}

export function buildDayKeyFromAnchor(day: Dayjs): string {
  return formatCalendarDateKey(day.toDate());
}

export function groupOccurrencesByCalendarDay(
  occurrences: EventOccurrencePreview[],
): Record<string, EventOccurrencePreview[]> {
  const grouped: Record<string, EventOccurrencePreview[]> = {};

  for (const occurrence of occurrences) {
    const key = getOccurrenceCalendarDayKey(occurrence);
    grouped[key] ??= [];
    grouped[key].push(occurrence);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
  }

  return grouped;
}
