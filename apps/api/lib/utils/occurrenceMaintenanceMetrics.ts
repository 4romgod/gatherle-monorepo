import { AWS_REGION, STAGE } from '@/constants';
import type {
  MaintainAllOccurrenceWindowsResult,
  MaintainOccurrenceWindowsResult,
} from '@/services/eventOccurrenceMaintenance';

const OCCURRENCE_MAINTENANCE_METRIC_NAMESPACE = 'Gatherle/EventOccurrenceMaintenance';
const OCCURRENCE_MAINTENANCE_METRIC_DIMENSIONS = ['Stage', 'Region', 'Service'] as const;
const OCCURRENCE_MAINTENANCE_SERVICE_DIMENSION = 'OccurrenceMaintenance';

type OccurrenceMaintenanceMetricName =
  | 'ProcessedSeriesCount'
  | 'SyncedSeriesCount'
  | 'DetectedMissingSeriesCount'
  | 'DetectedLowHorizonSeriesCount'
  | 'DetectedMetadataRepairSeriesCount'
  | 'DetectedDriftedOccurrenceCount'
  | 'ReconciledOccurrenceCount'
  | 'SkippedSeriesCount'
  | 'BatchesProcessed'
  | 'RemainingMissingSeriesCount'
  | 'RemainingLowHorizonSeriesCount'
  | 'RemainingMetadataRepairSeriesCount'
  | 'RemainingDriftedOccurrenceCount'
  | 'MaintenanceRunSuccess'
  | 'MaintenanceRunFailure';

function emitMetricSet(metrics: Partial<Record<OccurrenceMaintenanceMetricName, number>>) {
  const metricNames = Object.keys(metrics) as OccurrenceMaintenanceMetricName[];

  if (metricNames.length === 0) {
    return;
  }

  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: OCCURRENCE_MAINTENANCE_METRIC_NAMESPACE,
            Dimensions: [OCCURRENCE_MAINTENANCE_METRIC_DIMENSIONS],
            Metrics: metricNames.map((metricName) => ({
              Name: metricName,
              Unit: 'Count',
            })),
          },
        ],
      },
      Stage: STAGE,
      Region: AWS_REGION,
      Service: OCCURRENCE_MAINTENANCE_SERVICE_DIMENSION,
      ...metrics,
    }),
  );
}

export function emitOccurrenceMaintenanceRunMetrics(
  result: MaintainOccurrenceWindowsResult | MaintainAllOccurrenceWindowsResult,
): void {
  const batchesProcessed = 'batchesProcessed' in result ? result.batchesProcessed : 1;

  emitMetricSet({
    ProcessedSeriesCount: result.processedSeriesCount,
    SyncedSeriesCount: result.syncedSeriesCount,
    DetectedMissingSeriesCount: result.missingSeriesCount,
    DetectedLowHorizonSeriesCount: result.toppedUpSeriesCount,
    DetectedMetadataRepairSeriesCount: result.metadataRepairSeriesCount,
    DetectedDriftedOccurrenceCount: result.driftedOccurrenceCount,
    ReconciledOccurrenceCount: result.reconciledOccurrenceCount,
    SkippedSeriesCount: result.skippedSeriesCount,
    BatchesProcessed: batchesProcessed,
    MaintenanceRunSuccess: 1,
  });
}

export function emitOccurrenceMaintenanceHealthMetrics(
  result: MaintainOccurrenceWindowsResult | MaintainAllOccurrenceWindowsResult,
): void {
  emitMetricSet({
    RemainingMissingSeriesCount: result.missingSeriesCount,
    RemainingLowHorizonSeriesCount: result.toppedUpSeriesCount,
    RemainingMetadataRepairSeriesCount: result.metadataRepairSeriesCount,
    RemainingDriftedOccurrenceCount: result.driftedOccurrenceCount,
  });
}

export function emitOccurrenceMaintenanceFailureMetric(): void {
  emitMetricSet({
    MaintenanceRunFailure: 1,
  });
}

export { OCCURRENCE_MAINTENANCE_METRIC_NAMESPACE };
