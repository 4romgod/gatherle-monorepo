import EventOccurrenceService from '@/services/eventOccurrence';
import { EventOccurrenceDAO, EventOccurrenceParticipantDAO, EventSeriesDAO } from '@/mongodb/dao';
import { EventOccurrenceStatus, EventStatus, type EventSeries } from '@gatherle/commons/types';
import { DATE_FILTER_OPTIONS } from '@gatherle/commons';
import { logger } from '@/utils/logger';

jest.mock('@/mongodb/dao', () => ({
  EventOccurrenceDAO: {
    bulkUpsert: jest.fn(),
    cancelOccurrence: jest.fn(),
    clearReservedSlotCount: jest.fn(),
    deleteByOccurrenceIds: jest.fn(),
    readByOccurrenceId: jest.fn(),
    readByEventSeriesIdsInRange: jest.fn(),
    readByEventSeriesIdFromOriginalStart: jest.fn(),
    readExceptionOccurrenceKeysByEventSeriesId: jest.fn(),
    readUpcomingByEventSeriesId: jest.fn(),
    reassignOccurrencesToSeries: jest.fn(),
    deleteMissingGeneratedOccurrences: jest.fn(),
    deleteByEventSeriesId: jest.fn(),
    updateException: jest.fn(),
  },
  EventOccurrenceParticipantDAO: {
    cancelAllByOccurrence: jest.fn(),
    deleteByOccurrenceIds: jest.fn(),
    reassignOccurrenceIds: jest.fn(),
  },
  EventSeriesDAO: {
    readEventById: jest.fn(),
    readCandidateEventSeriesForOccurrences: jest.fn(),
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
    (EventOccurrenceDAO.readExceptionOccurrenceKeysByEventSeriesId as jest.Mock).mockResolvedValue([]);
  });

  describe('readOccurrenceById', () => {
    it('returns a persisted occurrence when one exists in storage', async () => {
      const persistedOccurrence = {
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        eventSeriesId: 'series-1',
      } as any;
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(persistedOccurrence);

      const result = await EventOccurrenceService.readOccurrenceById(persistedOccurrence.occurrenceId);

      expect(EventOccurrenceDAO.readByOccurrenceId).toHaveBeenCalledWith(persistedOccurrence.occurrenceId);
      expect(result).toBe(persistedOccurrence);
      expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
    });

    it('projects a synthetic single occurrence when the DB row does not exist', async () => {
      const singleSeries = buildSeries({
        eventId: 'series-2',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(null);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(singleSeries);

      const result = await EventOccurrenceService.readOccurrenceById('series-2#2026-05-07T10:00:00.000Z');

      expect(EventSeriesDAO.readEventById).toHaveBeenCalledWith('series-2');
      expect(result).toMatchObject({
        occurrenceId: 'series-2#2026-05-07T10:00:00.000Z',
        eventSeriesId: 'series-2',
      });
    });
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

    it('preserves exception rows by skipping generated upserts for matching occurrence keys', async () => {
      const eventSeries = buildSeries();
      (EventOccurrenceDAO.readExceptionOccurrenceKeysByEventSeriesId as jest.Mock).mockResolvedValue([
        'series-1#2026-05-13T16:00:00.000Z',
      ]);

      await EventOccurrenceService.syncRecurringSeriesOccurrences(eventSeries);

      const upsertedOccurrences = (EventOccurrenceDAO.bulkUpsert as jest.Mock).mock.calls[0][0];
      expect(upsertedOccurrences.map((occurrence: { occurrenceKey: string }) => occurrence.occurrenceKey)).toEqual([
        'series-1#2026-05-06T16:00:00.000Z',
        'series-1#2026-05-20T16:00:00.000Z',
      ]);
      expect(EventOccurrenceDAO.deleteMissingGeneratedOccurrences).toHaveBeenCalledWith('series-1', [
        'series-1#2026-05-06T16:00:00.000Z',
        'series-1#2026-05-13T16:00:00.000Z',
        'series-1#2026-05-20T16:00:00.000Z',
      ]);
    });

    it('throws and skips pruning when occurrence expansion fails', async () => {
      const eventSeries = buildSeries({
        primarySchedule: {
          ...buildSeries().primarySchedule,
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=3;BYDAY=WE\nINVALID:TRUE',
        },
      });

      await expect(EventOccurrenceService.syncRecurringSeriesOccurrences(eventSeries)).rejects.toThrow();
      expect(EventOccurrenceDAO.bulkUpsert).not.toHaveBeenCalled();
      expect(EventOccurrenceDAO.deleteMissingGeneratedOccurrences).not.toHaveBeenCalled();
    });

    it('clears stale generated rows when a recurring series has no dates in the current materialization window', async () => {
      const eventSeries = buildSeries({
        primarySchedule: {
          startAt: new Date('2020-01-01T16:00:00.000Z'),
          endAt: new Date('2020-01-01T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20200101T160000Z\nRRULE:FREQ=WEEKLY;UNTIL=20200129T160000Z;BYDAY=WE',
        },
      });

      await EventOccurrenceService.syncRecurringSeriesOccurrences(eventSeries);

      expect(EventOccurrenceDAO.bulkUpsert).not.toHaveBeenCalled();
      expect(EventOccurrenceDAO.deleteMissingGeneratedOccurrences).toHaveBeenCalledWith('series-1', []);
    });
  });

  describe('updateOccurrenceException', () => {
    it('marks a recurring occurrence as an exception with updated schedule fields', async () => {
      const persistedOccurrence = {
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        eventSeriesId: 'series-1',
        occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
        originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
        startAt: new Date('2026-05-06T16:00:00.000Z'),
        endAt: new Date('2026-05-06T19:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Scheduled,
        isException: false,
        seriesScheduleVersion: 1,
      };
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(persistedOccurrence);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(buildSeries());
      (EventOccurrenceDAO.updateException as jest.Mock).mockResolvedValue({
        ...persistedOccurrence,
        startAt: new Date('2026-05-06T17:00:00.000Z'),
        endAt: new Date('2026-05-06T20:00:00.000Z'),
        timezone: 'UTC',
        isException: true,
      });

      const result = await EventOccurrenceService.updateOccurrenceException({
        occurrenceId: persistedOccurrence.occurrenceId,
        startAt: new Date('2026-05-06T17:00:00.000Z'),
        endAt: new Date('2026-05-06T20:00:00.000Z'),
        timezone: 'UTC',
      });

      expect(EventOccurrenceDAO.updateException).toHaveBeenCalledWith(
        persistedOccurrence.occurrenceId,
        expect.objectContaining({
          startAt: new Date('2026-05-06T17:00:00.000Z'),
          endAt: new Date('2026-05-06T20:00:00.000Z'),
          timezone: 'UTC',
        }),
      );
      expect(result.isException).toBe(true);
    });

    it('rejects editing a cancelled occurrence', async () => {
      const persistedOccurrence = {
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        eventSeriesId: 'series-1',
        occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
        originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
        startAt: new Date('2026-05-06T16:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Cancelled,
        isException: true,
        seriesScheduleVersion: 1,
      };
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(persistedOccurrence);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(buildSeries());

      await expect(
        EventOccurrenceService.updateOccurrenceException({
          occurrenceId: persistedOccurrence.occurrenceId,
          timezone: 'UTC',
        }),
      ).rejects.toMatchObject({
        extensions: { code: 'BAD_REQUEST' },
      });
      expect(EventOccurrenceDAO.updateException).not.toHaveBeenCalled();
    });

    it('allows clearing an occurrence endAt by passing null', async () => {
      const persistedOccurrence = {
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        eventSeriesId: 'series-1',
        occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
        originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
        startAt: new Date('2026-05-06T16:00:00.000Z'),
        endAt: new Date('2026-05-06T19:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Scheduled,
        isException: false,
        seriesScheduleVersion: 1,
      };
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(persistedOccurrence);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(buildSeries());
      (EventOccurrenceDAO.updateException as jest.Mock).mockResolvedValue({
        ...persistedOccurrence,
        endAt: undefined,
        isException: true,
      });

      const result = await EventOccurrenceService.updateOccurrenceException({
        occurrenceId: persistedOccurrence.occurrenceId,
        endAt: null,
      });

      expect(EventOccurrenceDAO.updateException).toHaveBeenCalledWith(
        persistedOccurrence.occurrenceId,
        expect.objectContaining({
          startAt: persistedOccurrence.startAt,
          endAt: undefined,
          timezone: persistedOccurrence.timezone,
        }),
      );
      expect(result.endAt).toBeUndefined();
    });
  });

  describe('cancelOccurrence', () => {
    it('cancels the occurrence, cancels participant rows, and clears reserved slots', async () => {
      const persistedOccurrence = {
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        eventSeriesId: 'series-1',
        occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
        originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
        startAt: new Date('2026-05-06T16:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Scheduled,
        isException: false,
        seriesScheduleVersion: 1,
      };
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(persistedOccurrence);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(buildSeries());
      (EventOccurrenceDAO.cancelOccurrence as jest.Mock).mockResolvedValue({
        ...persistedOccurrence,
        status: EventOccurrenceStatus.Cancelled,
        isException: true,
      });

      const result = await EventOccurrenceService.cancelOccurrence(persistedOccurrence.occurrenceId);

      expect(EventOccurrenceParticipantDAO.cancelAllByOccurrence).toHaveBeenCalledWith(
        persistedOccurrence.occurrenceId,
      );
      expect(EventOccurrenceDAO.clearReservedSlotCount).toHaveBeenCalledWith(persistedOccurrence.occurrenceId);
      expect(result.status).toBe(EventOccurrenceStatus.Cancelled);
    });
  });

  describe('deleteFutureExceptionOccurrences', () => {
    it('deletes future exception rows and their participants', async () => {
      (EventOccurrenceDAO.readByEventSeriesIdFromOriginalStart as jest.Mock).mockResolvedValue([
        {
          occurrenceId: 'series-1#2026-05-13T16:00:00.000Z',
          isException: true,
        },
        {
          occurrenceId: 'series-1#2026-05-20T16:00:00.000Z',
          isException: false,
        },
      ]);

      await EventOccurrenceService.deleteFutureExceptionOccurrences('series-1', new Date('2026-05-13T16:00:00.000Z'));

      expect(EventOccurrenceParticipantDAO.deleteByOccurrenceIds).toHaveBeenCalledWith([
        'series-1#2026-05-13T16:00:00.000Z',
      ]);
      expect(EventOccurrenceDAO.deleteByOccurrenceIds).toHaveBeenCalledWith(['series-1#2026-05-13T16:00:00.000Z']);
    });
  });

  describe('moveFutureOccurrencesToSeries', () => {
    it('reassigns future occurrence rows and participant references to the successor series', async () => {
      (EventOccurrenceDAO.readByEventSeriesIdFromOriginalStart as jest.Mock).mockResolvedValue([
        {
          occurrenceId: 'series-1#2026-05-13T16:00:00.000Z',
          originalStartAt: new Date('2026-05-13T16:00:00.000Z'),
        },
      ]);

      await EventOccurrenceService.moveFutureOccurrencesToSeries(
        'series-1',
        'series-2',
        new Date('2026-05-13T16:00:00.000Z'),
        1,
      );

      expect(EventOccurrenceParticipantDAO.reassignOccurrenceIds).toHaveBeenCalledWith([
        {
          oldOccurrenceId: 'series-1#2026-05-13T16:00:00.000Z',
          newOccurrenceId: 'series-2#2026-05-13T16:00:00.000Z',
        },
      ]);
      expect(EventOccurrenceDAO.reassignOccurrencesToSeries).toHaveBeenCalledWith([
        {
          oldOccurrenceId: 'series-1#2026-05-13T16:00:00.000Z',
          occurrenceId: 'series-2#2026-05-13T16:00:00.000Z',
          eventSeriesId: 'series-2',
          occurrenceKey: 'series-2#2026-05-13T16:00:00.000Z',
          seriesScheduleVersion: 1,
        },
      ]);
    });
  });

  describe('readEventOccurrences', () => {
    it('merges recurring occurrences with projected single-event occurrences and sorts by startAt', async () => {
      const recurringSeries = buildSeries();
      const singleSeries = buildSeries({
        eventId: 'series-2',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      (EventSeriesDAO.readCandidateEventSeriesForOccurrences as jest.Mock).mockResolvedValue([
        recurringSeries,
        singleSeries,
      ]);
      (EventOccurrenceDAO.readByEventSeriesIdsInRange as jest.Mock).mockResolvedValue([
        {
          occurrenceId: 'series-1#2026-05-14T16:00:00.000Z',
          eventSeriesId: 'series-1',
          occurrenceKey: 'series-1#2026-05-14T16:00:00.000Z',
          originalStartAt: new Date('2026-05-14T16:00:00.000Z'),
          startAt: new Date('2026-05-14T16:00:00.000Z'),
          endAt: new Date('2026-05-14T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          status: EventOccurrenceStatus.Scheduled,
          isException: false,
          seriesScheduleVersion: 1,
          createdAt: new Date('2026-04-27T00:00:00.000Z'),
          updatedAt: new Date('2026-04-27T00:00:00.000Z'),
        },
      ]);

      const occurrences = await EventOccurrenceService.readEventOccurrences({
        dateRange: {
          startDate: new Date('2026-05-01T00:00:00.000Z'),
          endDate: new Date('2026-05-31T23:59:59.999Z'),
        },
      });

      expect(occurrences).toHaveLength(2);
      expect(occurrences[0].eventSeriesId).toBe('series-2');
      expect(occurrences[1].eventSeriesId).toBe('series-1');
    });

    it('applies occurrence-layer pagination after sorting merged results', async () => {
      const singleSeriesA = buildSeries({
        eventId: 'series-2',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      const singleSeriesB = buildSeries({
        eventId: 'series-3',
        primarySchedule: {
          startAt: new Date('2026-05-08T10:00:00.000Z'),
          endAt: new Date('2026-05-08T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260508T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      (EventSeriesDAO.readCandidateEventSeriesForOccurrences as jest.Mock).mockResolvedValue([
        singleSeriesA,
        singleSeriesB,
      ]);
      (EventOccurrenceDAO.readByEventSeriesIdsInRange as jest.Mock).mockResolvedValue([]);

      const occurrences = await EventOccurrenceService.readEventOccurrences({
        dateRange: {
          startDate: new Date('2026-05-01T00:00:00.000Z'),
          endDate: new Date('2026-05-31T23:59:59.999Z'),
        },
        pagination: {
          skip: 1,
          limit: 1,
        },
      });

      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].eventSeriesId).toBe('series-3');
    });

    it('resolves customDate windows using the same precedence as readEvents', async () => {
      (EventSeriesDAO.readCandidateEventSeriesForOccurrences as jest.Mock).mockResolvedValue([]);
      (EventOccurrenceDAO.readByEventSeriesIdsInRange as jest.Mock).mockResolvedValue([]);

      await EventOccurrenceService.readEventOccurrences({
        customDate: new Date('2026-05-07T10:00:00.000Z'),
        dateFilterOption: DATE_FILTER_OPTIONS.TODAY,
      });

      expect(EventOccurrenceDAO.readByEventSeriesIdsInRange).not.toHaveBeenCalled();
      expect(EventSeriesDAO.readCandidateEventSeriesForOccurrences).toHaveBeenCalled();
    });

    it('warns when a recurring occurrence query exceeds the recurring materialization horizon', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
      (EventSeriesDAO.readCandidateEventSeriesForOccurrences as jest.Mock).mockResolvedValue([buildSeries()]);
      (EventOccurrenceDAO.readByEventSeriesIdsInRange as jest.Mock).mockResolvedValue([]);

      await EventOccurrenceService.readEventOccurrences({
        dateRange: {
          startDate: new Date('2026-05-01T00:00:00.000Z'),
          endDate: new Date('2099-12-31T23:59:59.999Z'),
        },
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'Occurrence query exceeds the current recurring materialization window.',
        expect.objectContaining({
          requestedEndDate: new Date('2099-12-31T23:59:59.999Z'),
          materializationWindowEnd: expect.any(Date),
        }),
      );

      warnSpy.mockRestore();
    });
  });

  describe('readUpcomingOccurrencesForSeries', () => {
    it('returns projected upcoming occurrences for a single event series', async () => {
      const singleSeries = buildSeries({
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });

      const occurrences = await EventOccurrenceService.readUpcomingOccurrencesForSeries(
        singleSeries,
        5,
        new Date('2026-05-01T00:00:00.000Z'),
      );

      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].occurrenceKey).toBe('series-1#2026-05-07T10:00:00.000Z');
      expect(EventOccurrenceDAO.readUpcomingByEventSeriesId).not.toHaveBeenCalled();
    });

    it('delegates to the DAO for recurring series upcoming reads', async () => {
      const recurringSeries = buildSeries();
      (EventOccurrenceDAO.readUpcomingByEventSeriesId as jest.Mock).mockResolvedValue([
        {
          occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
          eventSeriesId: 'series-1',
          occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
          originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
          startAt: new Date('2026-05-06T16:00:00.000Z'),
          endAt: new Date('2026-05-06T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          status: EventOccurrenceStatus.Scheduled,
          isException: false,
          seriesScheduleVersion: 1,
          createdAt: new Date('2026-04-27T00:00:00.000Z'),
          updatedAt: new Date('2026-04-27T00:00:00.000Z'),
        },
      ]);

      const occurrences = await EventOccurrenceService.readUpcomingOccurrencesForSeries(
        recurringSeries,
        3,
        new Date('2026-05-01T00:00:00.000Z'),
      );

      expect(occurrences).toHaveLength(1);
      expect(EventOccurrenceDAO.readUpcomingByEventSeriesId).toHaveBeenCalledWith(
        'series-1',
        new Date('2026-05-01T00:00:00.000Z'),
        3,
      );
    });
  });
});
