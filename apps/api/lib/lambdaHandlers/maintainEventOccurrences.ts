import 'reflect-metadata';
import type { Context } from 'aws-lambda';
import { MongoDbClient, getConfigValue } from '@/clients';
import { SECRET_KEYS, validateEnv } from '@/constants';
import EventOccurrenceMaintenanceService from '@/services/eventOccurrenceMaintenance';
import type { MaintainAllOccurrenceWindowsResult } from '@/services/eventOccurrenceMaintenance';
import { logger } from '@/utils/logger';
import {
  emitOccurrenceMaintenanceFailureMetric,
  emitOccurrenceMaintenanceHealthMetrics,
  emitOccurrenceMaintenanceRunMetrics,
} from '@/utils/occurrenceMaintenanceMetrics';

const DEFAULT_THRESHOLD_DAYS = 30;
const DEFAULT_BATCH_LIMIT = 100;

let isDbConnected = false;

function summarizeRunResult(result: MaintainAllOccurrenceWindowsResult) {
  return {
    batchesProcessed: result.batchesProcessed,
    processedSeriesCount: result.processedSeriesCount,
    syncedSeriesCount: result.syncedSeriesCount,
    missingSeriesCount: result.missingSeriesCount,
    toppedUpSeriesCount: result.toppedUpSeriesCount,
    metadataRepairSeriesCount: result.metadataRepairSeriesCount,
    driftedOccurrenceCount: result.driftedOccurrenceCount,
    reconciledOccurrenceCount: result.reconciledOccurrenceCount,
    skippedSeriesCount: result.skippedSeriesCount,
    lastCursor: result.lastCursor,
  };
}

function summarizeHealthSnapshot(result: MaintainAllOccurrenceWindowsResult) {
  return {
    remainingMissingSeriesCount: result.missingSeriesCount,
    remainingLowHorizonSeriesCount: result.toppedUpSeriesCount,
    remainingMetadataRepairSeriesCount: result.metadataRepairSeriesCount,
    remainingDriftedOccurrenceCount: result.driftedOccurrenceCount,
  };
}

function hasOutstandingMaintenanceDebt(summary: ReturnType<typeof summarizeHealthSnapshot>): boolean {
  return Object.values(summary).some((value) => value > 0);
}

function parsePositiveIntegerEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return Math.trunc(parsed);
}

async function ensureDbConnected(): Promise<void> {
  if (!isDbConnected) {
    validateEnv();
    const mongoUrl = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
    await MongoDbClient.connectToDatabase(mongoUrl);
    isDbConnected = true;
  }
}

export const maintainEventOccurrencesHandler = async (_event: unknown, context?: Context): Promise<void> => {
  if (context?.awsRequestId) {
    logger.setRequestId(context.awsRequestId);
  }

  try {
    const startedAt = Date.now();
    await ensureDbConnected();

    const limit = parsePositiveIntegerEnvVar('OCCURRENCE_MAINTENANCE_BATCH_LIMIT', DEFAULT_BATCH_LIMIT);
    const thresholdDays = parsePositiveIntegerEnvVar('OCCURRENCE_MAINTENANCE_THRESHOLD_DAYS', DEFAULT_THRESHOLD_DAYS);

    logger.info('Starting scheduled event occurrence maintenance run', {
      limit,
      thresholdDays,
      worker: 'OccurrenceMaintenance',
    });

    const runResult = await EventOccurrenceMaintenanceService.maintainAllOccurrenceWindows({
      limit,
      thresholdDays,
      dryRun: false,
    });

    emitOccurrenceMaintenanceRunMetrics(runResult);

    const healthSnapshot = await EventOccurrenceMaintenanceService.maintainAllOccurrenceWindows({
      limit,
      thresholdDays,
      dryRun: true,
    });

    emitOccurrenceMaintenanceHealthMetrics(healthSnapshot);

    const runSummary = summarizeRunResult(runResult);
    const healthSummary = summarizeHealthSnapshot(healthSnapshot);

    logger.info('Scheduled event occurrence maintenance completed', {
      durationMs: Date.now() - startedAt,
      limit,
      thresholdDays,
      ...runSummary,
      ...healthSummary,
    });

    if (hasOutstandingMaintenanceDebt(healthSummary)) {
      logger.info('Occurrence maintenance residual backlog detected', {
        thresholdDays,
        ...healthSummary,
      });
    }
  } catch (error) {
    emitOccurrenceMaintenanceFailureMetric();
    logger.error('Scheduled event occurrence maintenance failed', { error });
    throw error;
  } finally {
    logger.clearRequestId();
  }
};
