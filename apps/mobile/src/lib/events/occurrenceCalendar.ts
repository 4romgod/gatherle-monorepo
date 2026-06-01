import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';

export type EventsCalendarViewMode = 'list' | 'week' | 'month';

export type OccurrenceCalendarRange = {
  startDate: string;
  endDate: string;
};

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

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  return addDays(startOfDay(date), -startOfDay(date).getDay());
}

function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date: Date) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function buildOccurrenceCalendarRange(
  viewMode: Exclude<EventsCalendarViewMode, 'list'>,
  anchorDate: Date,
): OccurrenceCalendarRange {
  const windowStart = viewMode === 'week' ? startOfWeek(anchorDate) : startOfWeek(startOfMonth(anchorDate));
  const windowEnd = viewMode === 'week' ? endOfWeek(anchorDate) : endOfWeek(endOfMonth(anchorDate));

  return {
    startDate: windowStart.toISOString(),
    endDate: windowEnd.toISOString(),
  };
}

export function buildOccurrenceCalendarLabel(
  viewMode: Exclude<EventsCalendarViewMode, 'list'>,
  anchorDate: Date,
): string {
  if (viewMode === 'week') {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = addDays(weekStart, 6);
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const startYear = weekStart.getFullYear();
    const endYear = weekEnd.getFullYear();

    if (startMonth === endMonth && startYear === endYear) {
      return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${endYear}`;
    }

    if (startYear === endYear) {
      return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${endYear}`;
    }

    return `${startMonth} ${weekStart.getDate()}, ${startYear} - ${endMonth} ${weekEnd.getDate()}, ${endYear}`;
  }

  return anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function shiftOccurrenceCalendarAnchor(
  viewMode: Exclude<EventsCalendarViewMode, 'list'>,
  anchorDate: Date,
  direction: -1 | 1,
) {
  const next = new Date(anchorDate);

  if (viewMode === 'week') {
    next.setDate(next.getDate() + direction * 7);
  } else {
    next.setMonth(next.getMonth() + direction);
  }

  return startOfDay(next);
}

export function buildWeekDays(anchorDate: Date) {
  const weekStart = startOfWeek(anchorDate);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function buildMonthGridDays(anchorDate: Date) {
  const gridStart = startOfWeek(startOfMonth(anchorDate));
  const gridEnd = endOfWeek(endOfMonth(anchorDate));
  const days: Date[] = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function buildDayKeyFromDate(date: Date, timezone?: string | null) {
  return formatCalendarDateKey(date, timezone);
}

export function getOccurrenceCalendarDayKey(occurrence: Pick<MobileEventOccurrence, 'startAt' | 'timezone'>) {
  return formatCalendarDateKey(new Date(occurrence.startAt), occurrence.timezone);
}

export function groupOccurrencesByCalendarDay(occurrences: MobileEventOccurrence[]) {
  const grouped: Record<string, MobileEventOccurrence[]> = {};

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

export function formatCalendarWeekday(date: Date, style: 'narrow' | 'short' | 'long' = 'short') {
  return date.toLocaleDateString('en-US', { weekday: style }).toUpperCase();
}

export function formatCalendarAgendaDayLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function isSameCalendarDay(left: Date, right: Date) {
  return buildDayKeyFromDate(left) === buildDayKeyFromDate(right);
}

export function isSameCalendarMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}
