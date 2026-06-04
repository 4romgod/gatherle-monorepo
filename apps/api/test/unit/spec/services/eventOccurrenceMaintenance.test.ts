import EventOccurrenceMaintenanceService from '@/services/eventOccurrenceMaintenance';
import { EventOccurrenceDAO, EventSeriesDAO } from '@/mongodb/dao';
import EventOccurrenceService from '@/services/eventOccurrence';
import { EventStatus, type EventSeries } from '@gatherle/commons/server/types';

jest.mock('@/mongodb/dao', () => ({
  EventOccurrenceDAO: {
    readLatestOriginalStartsBySeriesIds: jest.fn(),
    readSeriesIdsMissingSlug: jest.fn(),
    readReservedSlotDriftBySeriesIds: jest.fn(),
    reconcileReservedSlotCounts: jest.fn(),
  },
  EventSeriesDAO: {
    readOccurrenceMaintenanceBatch: jest.fn(),
    readOccurrenceMaintenanceSnapshotById: jest.fn(),
  },
}));

jest.mock('@/services/eventOccurrence', () => ({
  __esModule: true,
  default: {
    isRecurringSeries: jest.fn(),
    syncEventSeriesOccurrences: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  initLogger: jest.fn(),
}));

const buildSeries = (overrides: Partial<EventSeries> = {}): EventSeries =>
  ({
    eventId: 'series-1',
    slug: 'series-1',
    status: EventStatus.Upcoming,
    primarySchedule: {
      startAt: new Date('2026-05-01T18:00:00.000Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20260501T180000Z\nRRULE:FREQ=WEEKLY;BYDAY=FR',
    },
    scheduleVersion: 1,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  }) as EventSeries;

describe('EventOccurrenceMaintenanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (EventOccurrenceService.isRecurringSeries as jest.Mock).mockReturnValue(true);
    (EventOccurrenceService.syncEventSeriesOccurrences as jest.Mock).mockResolvedValue(undefined);
  });

  describe('maintainOccurrenceWindows', () => {
    it('syncs missing and low-horizon series in one batch', async () => {
      const missingSeries = buildSeries({ eventId: 'series-1' });
      const toppedUpSeries = buildSeries({ eventId: 'series-2' });
      const healthySeries = buildSeries({ eventId: 'series-3' });
      (EventSeriesDAO.readOccurrenceMaintenanceBatch as jest.Mock).mockResolvedValue([
        missingSeries,
        toppedUpSeries,
        healthySeries,
      ]);
      (EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds as jest.Mock).mockResolvedValue(
        new Map<string, Date>([
          ['series-2', new Date('2026-05-20T18:00:00.000Z')],
          ['series-3', new Date('2026-07-15T18:00:00.000Z')],
        ]),
      );
      (EventOccurrenceDAO.readSeriesIdsMissingSlug as jest.Mock).mockResolvedValue(new Set());
      (EventOccurrenceDAO.readReservedSlotDriftBySeriesIds as jest.Mock).mockResolvedValue([]);

      const result = await EventOccurrenceMaintenanceService.maintainOccurrenceWindows({
        thresholdDays: 30,
      });

      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledTimes(2);
      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(missingSeries);
      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(toppedUpSeries);
      expect(result).toEqual(
        expect.objectContaining({
          processedSeriesCount: 3,
          syncedSeriesCount: 2,
          missingSeriesCount: 1,
          toppedUpSeriesCount: 1,
          metadataRepairSeriesCount: 0,
          driftedOccurrenceCount: 0,
          reconciledOccurrenceCount: 0,
          skippedSeriesCount: 1,
          syncedSeriesIds: expect.arrayContaining(['series-1', 'series-2']),
        }),
      );
    });

    it('does not sync when running in dry-run mode', async () => {
      const missingSeries = buildSeries({ eventId: 'series-1' });
      (EventSeriesDAO.readOccurrenceMaintenanceBatch as jest.Mock).mockResolvedValue([missingSeries]);
      (EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds as jest.Mock).mockResolvedValue(new Map());
      (EventOccurrenceDAO.readSeriesIdsMissingSlug as jest.Mock).mockResolvedValue(new Set());
      (EventOccurrenceDAO.readReservedSlotDriftBySeriesIds as jest.Mock).mockResolvedValue([]);

      const result = await EventOccurrenceMaintenanceService.maintainOccurrenceWindows({ dryRun: true });

      expect(EventOccurrenceService.syncEventSeriesOccurrences).not.toHaveBeenCalled();
      expect(result.syncedSeriesCount).toBe(0);
      expect(result.missingSeriesCount).toBe(1);
      expect(result.dryRun).toBe(true);
    });

    it('returns a cursor when the batch is full', async () => {
      (EventSeriesDAO.readOccurrenceMaintenanceBatch as jest.Mock).mockResolvedValue([
        buildSeries({ eventId: 'series-1' }),
        buildSeries({ eventId: 'series-2' }),
      ]);
      (EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds as jest.Mock).mockResolvedValue(new Map());
      (EventOccurrenceDAO.readSeriesIdsMissingSlug as jest.Mock).mockResolvedValue(new Set());
      (EventOccurrenceDAO.readReservedSlotDriftBySeriesIds as jest.Mock).mockResolvedValue([]);

      const result = await EventOccurrenceMaintenanceService.maintainOccurrenceWindows({ limit: 2, dryRun: true });

      expect(result.nextCursor).toBe('series-2');
    });
  });

  describe('maintainAllOccurrenceWindows', () => {
    it('iterates through all batches and aggregates the result', async () => {
      (EventSeriesDAO.readOccurrenceMaintenanceBatch as jest.Mock)
        .mockResolvedValueOnce([buildSeries({ eventId: 'series-1' })])
        .mockResolvedValueOnce([buildSeries({ eventId: 'series-2' })])
        .mockResolvedValueOnce([]);
      (EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds as jest.Mock).mockResolvedValue(new Map());
      (EventOccurrenceDAO.readSeriesIdsMissingSlug as jest.Mock).mockResolvedValue(new Set());
      (EventOccurrenceDAO.readReservedSlotDriftBySeriesIds as jest.Mock).mockResolvedValue([]);

      const result = await EventOccurrenceMaintenanceService.maintainAllOccurrenceWindows({
        limit: 1,
        dryRun: true,
      });

      expect(EventSeriesDAO.readOccurrenceMaintenanceBatch).toHaveBeenNthCalledWith(1, 1, undefined);
      expect(EventSeriesDAO.readOccurrenceMaintenanceBatch).toHaveBeenNthCalledWith(2, 1, 'series-1');
      expect(EventSeriesDAO.readOccurrenceMaintenanceBatch).toHaveBeenNthCalledWith(3, 1, 'series-2');
      expect(result).toEqual({
        processedSeriesCount: 2,
        syncedSeriesCount: 0,
        missingSeriesCount: 2,
        toppedUpSeriesCount: 0,
        metadataRepairSeriesCount: 0,
        driftedOccurrenceCount: 0,
        reconciledOccurrenceCount: 0,
        skippedSeriesCount: 0,
        syncedSeriesIds: [],
        dryRun: true,
        batchesProcessed: 3,
        lastCursor: 'series-2',
      });
    });
  });

  describe('maintainSeriesWindow', () => {
    it('syncs one missing series snapshot', async () => {
      const eventSeries = buildSeries({ eventId: 'series-9' });
      (EventSeriesDAO.readOccurrenceMaintenanceSnapshotById as jest.Mock).mockResolvedValue(eventSeries);
      (EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds as jest.Mock).mockResolvedValue(new Map());
      (EventOccurrenceDAO.readSeriesIdsMissingSlug as jest.Mock).mockResolvedValue(new Set());
      (EventOccurrenceDAO.readReservedSlotDriftBySeriesIds as jest.Mock).mockResolvedValue([]);

      const result = await EventOccurrenceMaintenanceService.maintainSeriesWindow('series-9');

      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(eventSeries);
      expect(result).toEqual(
        expect.objectContaining({
          processedSeriesCount: 1,
          syncedSeriesCount: 1,
          missingSeriesCount: 1,
          toppedUpSeriesCount: 0,
          metadataRepairSeriesCount: 0,
          driftedOccurrenceCount: 0,
          reconciledOccurrenceCount: 0,
          skippedSeriesCount: 0,
          syncedSeriesIds: ['series-9'],
        }),
      );
    });

    it('skips syncing when the existing recurring window is healthy', async () => {
      const eventSeries = buildSeries({ eventId: 'series-9' });
      (EventSeriesDAO.readOccurrenceMaintenanceSnapshotById as jest.Mock).mockResolvedValue(eventSeries);
      (EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds as jest.Mock).mockResolvedValue(
        new Map([['series-9', new Date('2099-01-01T00:00:00.000Z')]]),
      );
      (EventOccurrenceDAO.readSeriesIdsMissingSlug as jest.Mock).mockResolvedValue(new Set());
      (EventOccurrenceDAO.readReservedSlotDriftBySeriesIds as jest.Mock).mockResolvedValue([]);

      const result = await EventOccurrenceMaintenanceService.maintainSeriesWindow('series-9');

      expect(EventOccurrenceService.syncEventSeriesOccurrences).not.toHaveBeenCalled();
      expect(result.skippedSeriesCount).toBe(1);
    });

    it('syncs one series when persisted occurrences are missing the readable slug snapshot', async () => {
      const eventSeries = buildSeries({ eventId: 'series-9', slug: 'weekly-coffee-code' });
      (EventSeriesDAO.readOccurrenceMaintenanceSnapshotById as jest.Mock).mockResolvedValue(eventSeries);
      (EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds as jest.Mock).mockResolvedValue(
        new Map([['series-9', new Date('2099-01-01T00:00:00.000Z')]]),
      );
      (EventOccurrenceDAO.readSeriesIdsMissingSlug as jest.Mock).mockResolvedValue(new Set(['series-9']));
      (EventOccurrenceDAO.readReservedSlotDriftBySeriesIds as jest.Mock).mockResolvedValue([]);

      const result = await EventOccurrenceMaintenanceService.maintainSeriesWindow('series-9');

      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(eventSeries);
      expect(result.syncedSeriesCount).toBe(1);
      expect(result.skippedSeriesCount).toBe(0);
    });

    it('reconciles occurrence reserved slot drift during maintenance', async () => {
      const eventSeries = buildSeries({ eventId: 'series-9' });
      (EventSeriesDAO.readOccurrenceMaintenanceSnapshotById as jest.Mock).mockResolvedValue(eventSeries);
      (EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds as jest.Mock).mockResolvedValue(
        new Map([['series-9', new Date('2099-01-01T00:00:00.000Z')]]),
      );
      (EventOccurrenceDAO.readSeriesIdsMissingSlug as jest.Mock).mockResolvedValue(new Set());
      (EventOccurrenceDAO.readReservedSlotDriftBySeriesIds as jest.Mock).mockResolvedValue([
        {
          occurrenceId: 'series-9#2026-05-09T10:00:00.000Z',
          eventSeriesId: 'series-9',
          expectedReservedSlotCount: 2,
          actualReservedSlotCount: 1,
        },
      ]);

      const result = await EventOccurrenceMaintenanceService.maintainSeriesWindow('series-9');

      expect(EventOccurrenceDAO.reconcileReservedSlotCounts).toHaveBeenCalledWith([
        {
          occurrenceId: 'series-9#2026-05-09T10:00:00.000Z',
          reservedSlotCount: 2,
        },
      ]);
      expect(result.driftedOccurrenceCount).toBe(1);
      expect(result.reconciledOccurrenceCount).toBe(1);
    });
  });
});
