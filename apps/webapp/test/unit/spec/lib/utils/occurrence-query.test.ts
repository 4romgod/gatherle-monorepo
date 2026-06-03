import {
  buildDefaultOccurrenceDateRange,
  buildSelectedEventOccurrenceDateRange,
  dedupeOccurrencesBySeries,
} from '@/lib/utils/occurrence-query';

describe('occurrence-query utilities', () => {
  it('builds a discovery range that extends one year from the start date', () => {
    const range = buildDefaultOccurrenceDateRange(new Date('2026-05-02T11:45:00.000Z'));
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);

    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(4);
    expect(startDate.getDate()).toBe(2);
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(startDate.getSeconds()).toBe(0);
    expect(startDate.getMilliseconds()).toBe(0);

    expect(endDate.getFullYear()).toBe(2027);
    expect(endDate.getMonth()).toBe(4);
    expect(endDate.getDate()).toBe(2);
    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    expect(endDate.getSeconds()).toBe(59);
    expect(endDate.getMilliseconds()).toBe(999);
  });

  it('builds a wide exact-match range for selected event series', () => {
    const range = buildSelectedEventOccurrenceDateRange(new Date('2026-05-02T11:45:00.000Z'));
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);

    expect(startDate.getFullYear()).toBe(2016);
    expect(startDate.getMonth()).toBe(4);
    expect(startDate.getDate()).toBe(2);
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(startDate.getSeconds()).toBe(0);
    expect(startDate.getMilliseconds()).toBe(0);

    expect(endDate.getFullYear()).toBe(2036);
    expect(endDate.getMonth()).toBe(4);
    expect(endDate.getDate()).toBe(2);
    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    expect(endDate.getSeconds()).toBe(59);
    expect(endDate.getMilliseconds()).toBe(999);
  });

  it('dedupes occurrences by eventSeriesId while preserving order', () => {
    const occurrences = [
      { occurrenceId: 'occ-1', eventSeriesId: 'series-a' },
      { occurrenceId: 'occ-2', eventSeriesId: 'series-a' },
      { occurrenceId: 'occ-3', eventSeriesId: 'series-b' },
      { occurrenceId: 'occ-4', eventSeriesId: 'series-c' },
      { occurrenceId: 'occ-5', eventSeriesId: 'series-b' },
    ];

    expect(dedupeOccurrencesBySeries(occurrences)).toEqual([
      { occurrenceId: 'occ-1', eventSeriesId: 'series-a' },
      { occurrenceId: 'occ-3', eventSeriesId: 'series-b' },
      { occurrenceId: 'occ-4', eventSeriesId: 'series-c' },
    ]);
  });

  it('stops once the unique-series limit is reached', () => {
    const occurrences = [
      { occurrenceId: 'occ-1', eventSeriesId: 'series-a' },
      { occurrenceId: 'occ-2', eventSeriesId: 'series-b' },
      { occurrenceId: 'occ-3', eventSeriesId: 'series-c' },
    ];

    expect(dedupeOccurrencesBySeries(occurrences, 2)).toEqual([
      { occurrenceId: 'occ-1', eventSeriesId: 'series-a' },
      { occurrenceId: 'occ-2', eventSeriesId: 'series-b' },
    ]);
  });
});
