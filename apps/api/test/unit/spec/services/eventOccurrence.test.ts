import EventOccurrenceService from '@/services/eventOccurrence';
import { EventOccurrenceDAO, EventOccurrenceParticipantDAO, EventSeriesDAO } from '@/mongodb/dao';
import { EventOccurrenceStatus, EventStatus, type EventOccurrence, type EventSeries } from '@gatherle/commons/types';
import { DATE_FILTER_OPTIONS } from '@gatherle/commons';
import { logger } from '@/utils/logger';

jest.mock('@/mongodb/dao', () => ({
  EventOccurrenceDAO: {
    bulkUpsert: jest.fn(),
    cancelOccurrence: jest.fn(),
    clearReservedSlotCount: jest.fn(),
    deleteByOccurrenceIds: jest.fn(),
    readByOccurrenceId: jest.fn(),
    readByEventSeriesId: jest.fn(),
    readByEventSeriesIds: jest.fn(),
    readFirstByEventSeriesId: jest.fn(),
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
      createdAt: new Date('2026-04-27T00:00:00.000Z'),
      updatedAt: new Date('2026-04-27T00:00:00.000Z'),
      ...overrides,
    }) as EventSeries;

  const buildOccurrence = (overrides: Partial<EventOccurrence> = {}): EventOccurrence =>
    ({
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
      ...overrides,
    }) as EventOccurrence;

  beforeEach(() => {
    jest.clearAllMocks();
    (EventOccurrenceDAO.readExceptionOccurrenceKeysByEventSeriesId as jest.Mock).mockResolvedValue([]);
  });

  describe('readOccurrenceById', () => {
    it('returns a persisted occurrence when one exists in storage', async () => {
      const persistedOccurrence = buildOccurrence();
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(persistedOccurrence);

      const result = await EventOccurrenceService.readOccurrenceById(persistedOccurrence.occurrenceId);

      expect(EventOccurrenceDAO.readByOccurrenceId).toHaveBeenCalledWith(persistedOccurrence.occurrenceId);
      expect(result).toBe(persistedOccurrence);
    });

    it('returns null when the occurrence does not exist in storage', async () => {
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(null);

      const result = await EventOccurrenceService.readOccurrenceById('missing-occurrence');

      expect(result).toBeNull();
      expect(EventSeriesDAO.readEventById).not.toHaveBeenCalled();
    });

    it('materializes missing persisted rows for a legacy series occurrence and retries the lookup', async () => {
      const eventSeries = buildSeries({
        eventId: 'legacy-single-series',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      const persistedOccurrence = buildOccurrence({
        occurrenceId: 'legacy-single-series#2026-05-07T10:00:00.000Z',
        eventSeriesId: 'legacy-single-series',
        occurrenceKey: 'legacy-single-series#2026-05-07T10:00:00.000Z',
        startAt: new Date('2026-05-07T10:00:00.000Z'),
        originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
      });
      (EventOccurrenceDAO.readByOccurrenceId as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(persistedOccurrence);
      (EventOccurrenceDAO.readByEventSeriesIds as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([persistedOccurrence]);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(eventSeries);

      const result = await EventOccurrenceService.readOccurrenceById(persistedOccurrence.occurrenceId);

      expect(EventSeriesDAO.readEventById).toHaveBeenCalledWith('legacy-single-series');
      expect(EventOccurrenceDAO.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          occurrenceId: persistedOccurrence.occurrenceId,
          eventSeriesId: 'legacy-single-series',
        }),
      ]);
      expect(result).toEqual(persistedOccurrence);
    });
  });

  describe('readSingleOccurrenceForSeries', () => {
    it('delegates to the occurrence DAO', async () => {
      const occurrence = buildOccurrence();
      (EventOccurrenceDAO.readFirstByEventSeriesId as jest.Mock).mockResolvedValue(occurrence);

      const result = await EventOccurrenceService.readSingleOccurrenceForSeries('series-1');

      expect(EventOccurrenceDAO.readFirstByEventSeriesId).toHaveBeenCalledWith('series-1');
      expect(result).toBe(occurrence);
    });

    it('materializes a first occurrence when a legacy series has none persisted yet', async () => {
      const eventSeries = buildSeries({
        eventId: 'legacy-single-series',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      const occurrence = buildOccurrence({
        occurrenceId: 'legacy-single-series#2026-05-07T10:00:00.000Z',
        eventSeriesId: 'legacy-single-series',
        occurrenceKey: 'legacy-single-series#2026-05-07T10:00:00.000Z',
        startAt: new Date('2026-05-07T10:00:00.000Z'),
        originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
      });
      (EventOccurrenceDAO.readFirstByEventSeriesId as jest.Mock).mockResolvedValueOnce(null);
      (EventOccurrenceDAO.readByEventSeriesIds as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([occurrence]);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(eventSeries);

      const result = await EventOccurrenceService.readSingleOccurrenceForSeries('legacy-single-series');

      expect(result).toEqual(occurrence);
      expect(EventOccurrenceDAO.bulkUpsert).toHaveBeenCalled();
    });
  });

  describe('readRepresentativeOccurrenceForSeries', () => {
    it('prefers the next upcoming non-cancelled occurrence for a series', async () => {
      const cancelledUpcoming = buildOccurrence({
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
        startAt: new Date('2026-05-06T16:00:00.000Z'),
        originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
        status: EventOccurrenceStatus.Cancelled,
      });
      const activeUpcoming = buildOccurrence({
        occurrenceId: 'series-1#2026-05-13T16:00:00.000Z',
        occurrenceKey: 'series-1#2026-05-13T16:00:00.000Z',
        startAt: new Date('2026-05-13T16:00:00.000Z'),
        originalStartAt: new Date('2026-05-13T16:00:00.000Z'),
      });
      const pastCompleted = buildOccurrence({
        occurrenceId: 'series-1#2026-04-29T16:00:00.000Z',
        occurrenceKey: 'series-1#2026-04-29T16:00:00.000Z',
        startAt: new Date('2026-04-29T16:00:00.000Z'),
        originalStartAt: new Date('2026-04-29T16:00:00.000Z'),
        status: EventOccurrenceStatus.Completed,
      });
      (EventOccurrenceDAO.readByEventSeriesIds as jest.Mock).mockResolvedValue([
        cancelledUpcoming,
        activeUpcoming,
        pastCompleted,
      ]);

      const result = await EventOccurrenceService.readRepresentativeOccurrenceForSeries(
        'series-1',
        new Date('2026-05-01T00:00:00.000Z'),
      );

      expect(EventOccurrenceDAO.readByEventSeriesIds).toHaveBeenCalledWith(['series-1']);
      expect(result).toEqual(activeUpcoming);
    });

    it('falls back to the most recent past non-cancelled occurrence when no future occurrence exists', async () => {
      const firstPast = buildOccurrence({
        occurrenceId: 'series-1#2026-04-15T16:00:00.000Z',
        occurrenceKey: 'series-1#2026-04-15T16:00:00.000Z',
        startAt: new Date('2026-04-15T16:00:00.000Z'),
        originalStartAt: new Date('2026-04-15T16:00:00.000Z'),
        status: EventOccurrenceStatus.Completed,
      });
      const latestPast = buildOccurrence({
        occurrenceId: 'series-1#2026-04-29T16:00:00.000Z',
        occurrenceKey: 'series-1#2026-04-29T16:00:00.000Z',
        startAt: new Date('2026-04-29T16:00:00.000Z'),
        originalStartAt: new Date('2026-04-29T16:00:00.000Z'),
        status: EventOccurrenceStatus.Completed,
      });
      (EventOccurrenceDAO.readByEventSeriesIds as jest.Mock).mockResolvedValue([firstPast, latestPast]);

      const result = await EventOccurrenceService.readRepresentativeOccurrenceForSeries(
        'series-1',
        new Date('2026-05-20T00:00:00.000Z'),
      );

      expect(result).toEqual(latestPast);
    });

    it('materializes missing occurrences before selecting a representative occurrence', async () => {
      const eventSeries = buildSeries({
        eventId: 'legacy-single-series',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      const occurrence = buildOccurrence({
        occurrenceId: 'legacy-single-series#2026-05-07T10:00:00.000Z',
        eventSeriesId: 'legacy-single-series',
        occurrenceKey: 'legacy-single-series#2026-05-07T10:00:00.000Z',
        startAt: new Date('2026-05-07T10:00:00.000Z'),
        originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
      });
      (EventOccurrenceDAO.readByEventSeriesIds as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([occurrence]);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(eventSeries);

      const result = await EventOccurrenceService.readRepresentativeOccurrenceForSeries('legacy-single-series');

      expect(result).toEqual(occurrence);
      expect(EventOccurrenceDAO.bulkUpsert).toHaveBeenCalled();
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
    it('builds concrete recurring occurrences with stable keys and derived end times', () => {
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

    it('builds a single persisted occurrence for a non-recurring series', () => {
      const eventSeries = buildSeries({
        eventId: 'series-2',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });

      expect(EventOccurrenceService.buildOccurrencesForSeries(eventSeries)).toEqual([
        expect.objectContaining({
          occurrenceId: 'series-2#2026-05-07T10:00:00.000Z',
          occurrenceKey: 'series-2#2026-05-07T10:00:00.000Z',
          eventSeriesId: 'series-2',
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
        }),
      ]);
    });

    it('returns an empty list when the series has no primary schedule', () => {
      const eventSeries = buildSeries({ primarySchedule: undefined });

      expect(EventOccurrenceService.buildOccurrencesForSeries(eventSeries)).toEqual([]);
    });
  });

  describe('syncEventSeriesOccurrences', () => {
    it('upserts a single occurrence for a non-recurring event series', async () => {
      const eventSeries = buildSeries({
        eventId: 'series-2',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });

      await EventOccurrenceService.syncEventSeriesOccurrences(eventSeries);

      expect(EventOccurrenceDAO.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          occurrenceId: 'series-2#2026-05-07T10:00:00.000Z',
          eventSeriesId: 'series-2',
        }),
      ]);
      expect(EventOccurrenceDAO.deleteMissingGeneratedOccurrences).toHaveBeenCalledWith('series-2', [
        'series-2#2026-05-07T10:00:00.000Z',
      ]);
      expect(EventOccurrenceDAO.deleteByEventSeriesId).not.toHaveBeenCalled();
    });

    it('upserts recurring occurrences and removes stale generated rows', async () => {
      const eventSeries = buildSeries();

      await EventOccurrenceService.syncEventSeriesOccurrences(eventSeries);

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

      await EventOccurrenceService.syncEventSeriesOccurrences(eventSeries);

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

      await expect(EventOccurrenceService.syncEventSeriesOccurrences(eventSeries)).rejects.toThrow();
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

      await EventOccurrenceService.syncEventSeriesOccurrences(eventSeries);

      expect(EventOccurrenceDAO.bulkUpsert).not.toHaveBeenCalled();
      expect(EventOccurrenceDAO.deleteMissingGeneratedOccurrences).toHaveBeenCalledWith('series-1', []);
    });
  });

  describe('updateOccurrenceException', () => {
    it('marks a recurring occurrence as an exception with updated schedule fields', async () => {
      const persistedOccurrence = buildOccurrence();
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
      const persistedOccurrence = buildOccurrence({
        status: EventOccurrenceStatus.Cancelled,
        isException: true,
      });
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
      const persistedOccurrence = buildOccurrence();
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
      const persistedOccurrence = buildOccurrence();
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
    it('returns persisted occurrence rows sorted by startAt', async () => {
      const seriesOne = buildSeries();
      const seriesTwo = buildSeries({ eventId: 'series-2' });
      (EventSeriesDAO.readCandidateEventSeriesForOccurrences as jest.Mock).mockResolvedValue([seriesOne, seriesTwo]);
      (EventOccurrenceDAO.readByEventSeriesIdsInRange as jest.Mock).mockResolvedValue([
        buildOccurrence({
          occurrenceId: 'series-1#2026-05-14T16:00:00.000Z',
          occurrenceKey: 'series-1#2026-05-14T16:00:00.000Z',
          originalStartAt: new Date('2026-05-14T16:00:00.000Z'),
          startAt: new Date('2026-05-14T16:00:00.000Z'),
        }),
        buildOccurrence({
          occurrenceId: 'series-2#2026-05-07T10:00:00.000Z',
          eventSeriesId: 'series-2',
          occurrenceKey: 'series-2#2026-05-07T10:00:00.000Z',
          originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
        }),
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

    it('applies occurrence-layer pagination after sorting results', async () => {
      (EventSeriesDAO.readCandidateEventSeriesForOccurrences as jest.Mock).mockResolvedValue([
        buildSeries({ eventId: 'series-1' }),
        buildSeries({ eventId: 'series-2' }),
      ]);
      (EventOccurrenceDAO.readByEventSeriesIdsInRange as jest.Mock).mockResolvedValue([
        buildOccurrence({
          occurrenceId: 'series-1#2026-05-07T10:00:00.000Z',
          occurrenceKey: 'series-1#2026-05-07T10:00:00.000Z',
          originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
          startAt: new Date('2026-05-07T10:00:00.000Z'),
        }),
        buildOccurrence({
          occurrenceId: 'series-2#2026-05-08T10:00:00.000Z',
          eventSeriesId: 'series-2',
          occurrenceKey: 'series-2#2026-05-08T10:00:00.000Z',
          originalStartAt: new Date('2026-05-08T10:00:00.000Z'),
          startAt: new Date('2026-05-08T10:00:00.000Z'),
        }),
      ]);

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
      expect(occurrences[0].eventSeriesId).toBe('series-2');
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
    it('delegates to the DAO for a single-date event series', async () => {
      const singleSeries = buildSeries({
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      (EventOccurrenceDAO.readUpcomingByEventSeriesId as jest.Mock).mockResolvedValue([
        buildOccurrence({
          occurrenceId: 'series-1#2026-05-07T10:00:00.000Z',
          occurrenceKey: 'series-1#2026-05-07T10:00:00.000Z',
          originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
        }),
      ]);

      const occurrences = await EventOccurrenceService.readUpcomingOccurrencesForSeries(
        singleSeries,
        5,
        new Date('2026-05-01T00:00:00.000Z'),
      );

      expect(occurrences).toHaveLength(1);
      expect(EventOccurrenceDAO.readUpcomingByEventSeriesId).toHaveBeenCalledWith(
        'series-1',
        new Date('2026-05-01T00:00:00.000Z'),
        5,
      );
    });

    it('delegates to the DAO for recurring series upcoming reads', async () => {
      const recurringSeries = buildSeries();
      (EventOccurrenceDAO.readUpcomingByEventSeriesId as jest.Mock).mockResolvedValue([buildOccurrence()]);

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

    it('materializes upcoming occurrences for a legacy series when none are persisted yet', async () => {
      const singleSeries = buildSeries({
        eventId: 'legacy-single-series',
        primarySchedule: {
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      });
      const occurrence = buildOccurrence({
        occurrenceId: 'legacy-single-series#2026-05-07T10:00:00.000Z',
        eventSeriesId: 'legacy-single-series',
        occurrenceKey: 'legacy-single-series#2026-05-07T10:00:00.000Z',
        startAt: new Date('2026-05-07T10:00:00.000Z'),
        originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
      });
      (EventOccurrenceDAO.readUpcomingByEventSeriesId as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([occurrence]);
      (EventOccurrenceDAO.readByEventSeriesIds as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([occurrence]);

      const occurrences = await EventOccurrenceService.readUpcomingOccurrencesForSeries(
        singleSeries,
        5,
        new Date('2026-05-01T00:00:00.000Z'),
      );

      expect(occurrences).toEqual([occurrence]);
      expect(EventOccurrenceDAO.bulkUpsert).toHaveBeenCalled();
    });
  });
});
