import EventOccurrenceService from '@/services/eventOccurrence';
import { EventOccurrenceDAO } from '@/mongodb/dao';
import { EventOccurrenceStatus, EventStatus, type EventSeries } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  EventOccurrenceDAO: {
    bulkUpsert: jest.fn(),
    deleteMissingGeneratedOccurrences: jest.fn(),
    deleteByEventSeriesId: jest.fn(),
  },
}));

describe('EventOccurrenceService', () => {
  const buildSeries = (overrides: Partial<EventSeries> = {}): EventSeries =>
    ({
      eventId: 'series-1',
      title: 'Weekly Coffee & Code',
      description: 'A recurring event',
      slug: 'weekly-coffee-code',
      status: EventStatus.Upcoming,
      organizers: [],
      eventCategories: [],
      location: { locationType: 'tba' },
      primarySchedule: {
        startAt: new Date('2026-05-06T16:00:00.000Z'),
        endAt: new Date('2026-05-06T19:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=3;BYDAY=WE',
      },
      scheduleVersion: 1,
      ...overrides,
    }) as EventSeries;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isRecurringSeries', () => {
    it('returns false for a single event encoded as COUNT=1', () => {
      const eventSeries = buildSeries({
        primarySchedule: {
          startAt: new Date('2026-05-06T16:00:00.000Z'),
          endAt: new Date('2026-05-06T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });

      expect(EventOccurrenceService.isRecurringSeries(eventSeries)).toBe(false);
    });

    it('returns false for a multi-day single event encoded as contiguous DAILY count', () => {
      const eventSeries = buildSeries({
        primarySchedule: {
          startAt: new Date('2026-05-09T10:00:00.000Z'),
          endAt: new Date('2026-05-10T20:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260509T100000Z\nRRULE:FREQ=DAILY;COUNT=2',
        },
      });

      expect(EventOccurrenceService.isRecurringSeries(eventSeries)).toBe(false);
    });

    it('returns true for a weekly recurring series', () => {
      expect(EventOccurrenceService.isRecurringSeries(buildSeries())).toBe(true);
    });
  });

  describe('buildOccurrencesForSeries', () => {
    it('builds concrete occurrences with stable keys and derived end times', () => {
      const eventSeries = buildSeries();
      const now = new Date('2026-05-01T00:00:00.000Z');

      const occurrences = EventOccurrenceService.buildOccurrencesForSeries(eventSeries, now);

      expect(occurrences).toHaveLength(3);
      expect(occurrences[0]).toMatchObject({
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
        eventSeriesId: 'series-1',
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Scheduled,
        isException: false,
        seriesScheduleVersion: 1,
      });
      expect(occurrences[0].endAt?.toISOString()).toBe('2026-05-06T19:00:00.000Z');
      expect(occurrences[1].startAt.toISOString()).toBe('2026-05-13T16:00:00.000Z');
      expect(occurrences[2].startAt.toISOString()).toBe('2026-05-20T16:00:00.000Z');
    });

    it('returns an empty list for non-recurring series', () => {
      const eventSeries = buildSeries({
        primarySchedule: {
          startAt: new Date('2026-05-06T16:00:00.000Z'),
          endAt: new Date('2026-05-06T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });

      expect(EventOccurrenceService.buildOccurrencesForSeries(eventSeries)).toEqual([]);
    });
  });

  describe('syncRecurringSeriesOccurrences', () => {
    it('deletes occurrence rows when the series is not recurring', async () => {
      const eventSeries = buildSeries({
        primarySchedule: {
          startAt: new Date('2026-05-06T16:00:00.000Z'),
          endAt: new Date('2026-05-06T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });

      await EventOccurrenceService.syncRecurringSeriesOccurrences(eventSeries);

      expect(EventOccurrenceDAO.deleteByEventSeriesId).toHaveBeenCalledWith('series-1');
      expect(EventOccurrenceDAO.bulkUpsert).not.toHaveBeenCalled();
    });

    it('upserts recurring occurrences and removes stale generated rows', async () => {
      const eventSeries = buildSeries();

      await EventOccurrenceService.syncRecurringSeriesOccurrences(eventSeries);

      expect(EventOccurrenceDAO.bulkUpsert).toHaveBeenCalledTimes(1);
      const upsertedOccurrences = (EventOccurrenceDAO.bulkUpsert as jest.Mock).mock.calls[0][0];
      expect(upsertedOccurrences).toHaveLength(3);
      expect(EventOccurrenceDAO.deleteMissingGeneratedOccurrences).toHaveBeenCalledWith('series-1', [
        'series-1#2026-05-06T16:00:00.000Z',
        'series-1#2026-05-13T16:00:00.000Z',
        'series-1#2026-05-20T16:00:00.000Z',
      ]);
    });
  });
});
