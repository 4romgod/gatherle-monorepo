import { EventOccurrenceDAO, EventSeriesDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import EventOccurrenceService from './eventOccurrence';

const DEFAULT_MAINTENANCE_BATCH_LIMIT = 100;
const DEFAULT_TOP_UP_THRESHOLD_DAYS = 30;
const MAINTENANCE_SYNC_CONCURRENCY = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type OccurrenceMaintenanceSeries = Awaited<ReturnType<typeof EventSeriesDAO.readOccurrenceMaintenanceBatch>>[number];
type OccurrenceReservedSlotDrift = Awaited<
  ReturnType<typeof EventOccurrenceDAO.readReservedSlotDriftBySeriesIds>
>[number];

export interface MaintainOccurrenceWindowsOptions {
  limit?: number;
  afterEventId?: string;
  thresholdDays?: number;
  dryRun?: boolean;
}

export interface MaintainOccurrenceWindowsResult {
  processedSeriesCount: number;
  syncedSeriesCount: number;
  missingSeriesCount: number;
  toppedUpSeriesCount: number;
  metadataRepairSeriesCount: number;
  driftedOccurrenceCount: number;
  reconciledOccurrenceCount: number;
  skippedSeriesCount: number;
  nextCursor?: string;
  syncedSeriesIds: string[];
  dryRun: boolean;
}

export interface MaintainAllOccurrenceWindowsResult extends Omit<MaintainOccurrenceWindowsResult, 'nextCursor'> {
  batchesProcessed: number;
  lastCursor?: string;
}

function buildTopUpThresholdDate(now: Date, thresholdDays: number): Date {
  return new Date(now.getTime() + thresholdDays * MS_PER_DAY);
}

function sanitizeBatchLimit(limit?: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_MAINTENANCE_BATCH_LIMIT;
  }

  return Math.max(1, Math.trunc(limit as number));
}

function sanitizeThresholdDays(thresholdDays?: number): number {
  if (!Number.isFinite(thresholdDays)) {
    return DEFAULT_TOP_UP_THRESHOLD_DAYS;
  }

  return Math.max(1, Math.trunc(thresholdDays as number));
}

class EventOccurrenceMaintenanceService {
  private static async syncSeriesInBatches(seriesToSync: OccurrenceMaintenanceSeries[]): Promise<string[]> {
    const syncedSeriesIds: string[] = [];

    for (let index = 0; index < seriesToSync.length; index += MAINTENANCE_SYNC_CONCURRENCY) {
      const batch = seriesToSync.slice(index, index + MAINTENANCE_SYNC_CONCURRENCY);
      await Promise.all(
        batch.map(async (eventSeries) => {
          await EventOccurrenceService.syncEventSeriesOccurrences(eventSeries);
          syncedSeriesIds.push(eventSeries.eventId);
        }),
      );
    }

    return syncedSeriesIds;
  }

  private static classifySeriesForMaintenance(
    seriesBatch: OccurrenceMaintenanceSeries[],
    latestOriginalStartsBySeriesId: Map<string, Date>,
    seriesIdsMissingSlug: Set<string>,
    thresholdDate: Date,
  ): {
    missingSeries: OccurrenceMaintenanceSeries[];
    toppedUpSeries: OccurrenceMaintenanceSeries[];
    metadataRepairSeries: OccurrenceMaintenanceSeries[];
  } {
    const missingSeries: OccurrenceMaintenanceSeries[] = [];
    const toppedUpSeries: OccurrenceMaintenanceSeries[] = [];
    const metadataRepairSeries: OccurrenceMaintenanceSeries[] = [];

    for (const eventSeries of seriesBatch) {
      if (seriesIdsMissingSlug.has(eventSeries.eventId)) {
        metadataRepairSeries.push(eventSeries);
        continue;
      }

      const latestOriginalStartAt = latestOriginalStartsBySeriesId.get(eventSeries.eventId);

      if (!latestOriginalStartAt) {
        missingSeries.push(eventSeries);
        continue;
      }

      if (
        EventOccurrenceService.isRecurringSeries(eventSeries) &&
        latestOriginalStartAt.getTime() < thresholdDate.getTime()
      ) {
        toppedUpSeries.push(eventSeries);
      }
    }

    return {
      missingSeries,
      toppedUpSeries,
      metadataRepairSeries,
    };
  }

  static async maintainOccurrenceWindows(
    options: MaintainOccurrenceWindowsOptions = {},
  ): Promise<MaintainOccurrenceWindowsResult> {
    const limit = sanitizeBatchLimit(options.limit);
    const thresholdDays = sanitizeThresholdDays(options.thresholdDays);
    const dryRun = options.dryRun ?? false;
    const seriesBatch = await EventSeriesDAO.readOccurrenceMaintenanceBatch(limit, options.afterEventId);
    const latestOriginalStartsBySeriesId = await EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds(
      seriesBatch.map((eventSeries) => eventSeries.eventId),
    );
    const seriesIdsMissingSlug = await EventOccurrenceDAO.readSeriesIdsMissingSlug(
      seriesBatch.map((eventSeries) => eventSeries.eventId),
    );
    const driftedOccurrences = await EventOccurrenceDAO.readReservedSlotDriftBySeriesIds(
      seriesBatch.map((eventSeries) => eventSeries.eventId),
    );
    const thresholdDate = buildTopUpThresholdDate(new Date(), thresholdDays);
    const { missingSeries, toppedUpSeries, metadataRepairSeries } = this.classifySeriesForMaintenance(
      seriesBatch,
      latestOriginalStartsBySeriesId,
      seriesIdsMissingSlug,
      thresholdDate,
    );

    const seriesToSync = [...missingSeries, ...toppedUpSeries, ...metadataRepairSeries];
    const maintainedSeriesIds = new Set<string>([
      ...seriesToSync.map((eventSeries) => eventSeries.eventId),
      ...driftedOccurrences.map((occurrence) => occurrence.eventSeriesId),
    ]);

    if (seriesToSync.length > 0) {
      logger.info('[EventOccurrenceMaintenanceService] Occurrence maintenance batch classified', {
        processedSeriesCount: seriesBatch.length,
        missingSeriesCount: missingSeries.length,
        toppedUpSeriesCount: toppedUpSeries.length,
        metadataRepairSeriesCount: metadataRepairSeries.length,
        driftedOccurrenceCount: driftedOccurrences.length,
        dryRun,
        thresholdDate,
      });
    }

    const syncedSeriesIds = dryRun ? [] : await this.syncSeriesInBatches(seriesToSync);
    const reconciledOccurrenceCount = dryRun ? 0 : driftedOccurrences.length;

    if (!dryRun && driftedOccurrences.length > 0) {
      await EventOccurrenceDAO.reconcileReservedSlotCounts(
        driftedOccurrences.map((occurrence: OccurrenceReservedSlotDrift) => ({
          occurrenceId: occurrence.occurrenceId,
          reservedSlotCount: occurrence.expectedReservedSlotCount,
        })),
      );
    }

    return {
      processedSeriesCount: seriesBatch.length,
      syncedSeriesCount: syncedSeriesIds.length,
      missingSeriesCount: missingSeries.length,
      toppedUpSeriesCount: toppedUpSeries.length,
      metadataRepairSeriesCount: metadataRepairSeries.length,
      driftedOccurrenceCount: driftedOccurrences.length,
      reconciledOccurrenceCount,
      skippedSeriesCount: Math.max(0, seriesBatch.length - maintainedSeriesIds.size),
      nextCursor: seriesBatch.length === limit ? seriesBatch[seriesBatch.length - 1]?.eventId : undefined,
      syncedSeriesIds,
      dryRun,
    };
  }

  static async maintainAllOccurrenceWindows(
    options: MaintainOccurrenceWindowsOptions = {},
  ): Promise<MaintainAllOccurrenceWindowsResult> {
    const syncedSeriesIds = new Set<string>();
    let processedSeriesCount = 0;
    let syncedSeriesCount = 0;
    let missingSeriesCount = 0;
    let toppedUpSeriesCount = 0;
    let metadataRepairSeriesCount = 0;
    let driftedOccurrenceCount = 0;
    let reconciledOccurrenceCount = 0;
    let skippedSeriesCount = 0;
    let batchesProcessed = 0;
    let currentCursor = options.afterEventId;
    let lastCursor: string | undefined;

    while (true) {
      const result = await this.maintainOccurrenceWindows({
        ...options,
        afterEventId: currentCursor,
      });

      batchesProcessed += 1;
      processedSeriesCount += result.processedSeriesCount;
      syncedSeriesCount += result.syncedSeriesCount;
      missingSeriesCount += result.missingSeriesCount;
      toppedUpSeriesCount += result.toppedUpSeriesCount;
      metadataRepairSeriesCount += result.metadataRepairSeriesCount;
      driftedOccurrenceCount += result.driftedOccurrenceCount;
      reconciledOccurrenceCount += result.reconciledOccurrenceCount;
      skippedSeriesCount += result.skippedSeriesCount;
      result.syncedSeriesIds.forEach((eventSeriesId) => syncedSeriesIds.add(eventSeriesId));

      lastCursor = result.nextCursor ?? currentCursor;

      if (!result.nextCursor) {
        return {
          processedSeriesCount,
          syncedSeriesCount,
          missingSeriesCount,
          toppedUpSeriesCount,
          metadataRepairSeriesCount,
          driftedOccurrenceCount,
          reconciledOccurrenceCount,
          skippedSeriesCount,
          syncedSeriesIds: [...syncedSeriesIds],
          dryRun: options.dryRun ?? false,
          batchesProcessed,
          lastCursor,
        };
      }

      if (result.nextCursor === currentCursor) {
        throw new Error(`Occurrence maintenance cursor did not advance for eventSeriesId ${result.nextCursor}.`);
      }

      currentCursor = result.nextCursor;
    }
  }

  static async maintainSeriesWindow(
    eventSeriesId: string,
    options: Pick<MaintainOccurrenceWindowsOptions, 'thresholdDays' | 'dryRun'> = {},
  ): Promise<MaintainOccurrenceWindowsResult> {
    const thresholdDays = sanitizeThresholdDays(options.thresholdDays);
    const dryRun = options.dryRun ?? false;
    const eventSeries = await EventSeriesDAO.readOccurrenceMaintenanceSnapshotById(eventSeriesId);
    const latestOriginalStartsBySeriesId = await EventOccurrenceDAO.readLatestOriginalStartsBySeriesIds([
      eventSeriesId,
    ]);
    const seriesIdsMissingSlug = await EventOccurrenceDAO.readSeriesIdsMissingSlug([eventSeriesId]);
    const driftedOccurrences = await EventOccurrenceDAO.readReservedSlotDriftBySeriesIds([eventSeriesId]);
    const thresholdDate = buildTopUpThresholdDate(new Date(), thresholdDays);
    const latestOriginalStartAt = latestOriginalStartsBySeriesId.get(eventSeriesId);

    const isMissing = !latestOriginalStartAt;
    const needsMetadataRepair = seriesIdsMissingSlug.has(eventSeriesId);
    const needsTopUp =
      !isMissing &&
      !needsMetadataRepair &&
      EventOccurrenceService.isRecurringSeries(eventSeries) &&
      latestOriginalStartAt.getTime() < thresholdDate.getTime();
    const shouldSync = isMissing || needsTopUp || needsMetadataRepair;
    const handledByDriftRepair = driftedOccurrences.length > 0;

    if (shouldSync && !dryRun) {
      await EventOccurrenceService.syncEventSeriesOccurrences(eventSeries);
    }

    if (!dryRun && driftedOccurrences.length > 0) {
      await EventOccurrenceDAO.reconcileReservedSlotCounts(
        driftedOccurrences.map((occurrence: OccurrenceReservedSlotDrift) => ({
          occurrenceId: occurrence.occurrenceId,
          reservedSlotCount: occurrence.expectedReservedSlotCount,
        })),
      );
    }

    return {
      processedSeriesCount: 1,
      syncedSeriesCount: shouldSync && !dryRun ? 1 : 0,
      missingSeriesCount: isMissing ? 1 : 0,
      toppedUpSeriesCount: needsTopUp ? 1 : 0,
      metadataRepairSeriesCount: needsMetadataRepair ? 1 : 0,
      driftedOccurrenceCount: driftedOccurrences.length,
      reconciledOccurrenceCount: !dryRun ? driftedOccurrences.length : 0,
      skippedSeriesCount: shouldSync || handledByDriftRepair ? 0 : 1,
      syncedSeriesIds: shouldSync && !dryRun ? [eventSeriesId] : [],
      dryRun,
    };
  }
}

export default EventOccurrenceMaintenanceService;
