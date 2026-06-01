import dayjs from 'dayjs';
import {
  buildDayKeyFromAnchor,
  buildMonthGridDays,
  buildOccurrenceCalendarRange,
  buildWeekDays,
  coerceEventsCalendarViewMode,
  getOccurrenceCalendarDayKey,
  groupOccurrencesByCalendarDay,
  shiftOccurrenceCalendarAnchor,
} from '@/components/events/calendar/calendar-utils';

describe('calendar-utils', () => {
  it('coerces invalid values back to list view', () => {
    expect(coerceEventsCalendarViewMode('week')).toBe('week');
    expect(coerceEventsCalendarViewMode('month')).toBe('month');
    expect(coerceEventsCalendarViewMode('invalid')).toBe('list');
    expect(coerceEventsCalendarViewMode(undefined)).toBe('list');
  });

  it('builds a week range around the anchor date', () => {
    const anchorDate = dayjs('2026-06-03');
    const range = buildOccurrenceCalendarRange('week', anchorDate);

    expect(range.startDate).toBe(anchorDate.startOf('week').startOf('day').toDate().toISOString());
    expect(range.endDate).toBe(anchorDate.endOf('week').endOf('day').toDate().toISOString());
  });

  it('builds a month grid that includes leading and trailing days', () => {
    const days = buildMonthGridDays(dayjs('2026-06-03'));

    expect(days[0].format('YYYY-MM-DD')).toBe('2026-05-31');
    expect(days.at(-1)?.format('YYYY-MM-DD')).toBe('2026-07-04');
    expect(days).toHaveLength(35);
  });

  it('shifts week and month anchors correctly', () => {
    expect(shiftOccurrenceCalendarAnchor('week', dayjs('2026-06-03'), 1).format('YYYY-MM-DD')).toBe('2026-06-10');
    expect(shiftOccurrenceCalendarAnchor('month', dayjs('2026-06-03'), -1).format('YYYY-MM-DD')).toBe('2026-05-03');
  });

  it('groups occurrences by calendar day and sorts them by start time', () => {
    const grouped = groupOccurrencesByCalendarDay([
      { occurrenceId: 'late', startAt: '2026-06-02T14:00:00.000Z', timezone: 'UTC' } as any,
      { occurrenceId: 'other-day', startAt: '2026-06-03T09:00:00.000Z', timezone: 'UTC' } as any,
      { occurrenceId: 'early', startAt: '2026-06-02T08:00:00.000Z', timezone: 'UTC' } as any,
    ]);

    expect(grouped['2026-06-02'].map((occurrence) => occurrence.occurrenceId)).toEqual(['early', 'late']);
    expect(grouped['2026-06-03'].map((occurrence) => occurrence.occurrenceId)).toEqual(['other-day']);
  });

  it('uses timezone-aware date keys for occurrences and local keys for anchors', () => {
    const occurrenceKey = getOccurrenceCalendarDayKey({
      startAt: '2026-06-01T22:30:00.000Z',
      timezone: 'Africa/Johannesburg',
    } as any);

    expect(occurrenceKey).toBe('2026-06-02');
    expect(buildWeekDays(dayjs('2026-06-03'))).toHaveLength(7);
    expect(buildDayKeyFromAnchor(dayjs('2026-06-03'))).toBe('2026-06-03');
  });
});
