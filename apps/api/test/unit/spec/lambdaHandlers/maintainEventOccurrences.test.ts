jest.mock('reflect-metadata', () => ({}));

jest.mock('@/clients', () => ({
  MongoDbClient: { connectToDatabase: jest.fn().mockResolvedValue(undefined) },
  getConfigValue: jest.fn().mockResolvedValue('mongodb://test'),
}));

jest.mock('@/constants', () => ({
  SECRET_KEYS: { MONGO_DB_URL: 'MONGO_DB_URL' },
  validateEnv: jest.fn(),
}));

jest.mock('@/services/eventOccurrenceMaintenance', () => ({
  __esModule: true,
  default: {
    maintainAllOccurrenceWindows: jest.fn(),
  },
}));

jest.mock('@/utils/occurrenceMaintenanceMetrics', () => ({
  emitOccurrenceMaintenanceRunMetrics: jest.fn(),
  emitOccurrenceMaintenanceHealthMetrics: jest.fn(),
  emitOccurrenceMaintenanceFailureMetric: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setRequestId: jest.fn(),
    clearRequestId: jest.fn(),
  },
}));

import type { Context } from 'aws-lambda';

async function loadAll() {
  const { MongoDbClient, getConfigValue } = await import('@/clients');
  const EventOccurrenceMaintenanceService = (await import('@/services/eventOccurrenceMaintenance')).default;
  const {
    emitOccurrenceMaintenanceFailureMetric,
    emitOccurrenceMaintenanceHealthMetrics,
    emitOccurrenceMaintenanceRunMetrics,
  } = await import('@/utils/occurrenceMaintenanceMetrics');
  const { maintainEventOccurrencesHandler } = await import('@/lambdaHandlers/maintainEventOccurrences');

  return {
    MongoDbClient,
    getConfigValue,
    EventOccurrenceMaintenanceService,
    emitOccurrenceMaintenanceFailureMetric,
    emitOccurrenceMaintenanceHealthMetrics,
    emitOccurrenceMaintenanceRunMetrics,
    maintainEventOccurrencesHandler,
  };
}

describe('maintainEventOccurrencesHandler', () => {
  const context = {
    awsRequestId: 'request-1',
  } as Context;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.OCCURRENCE_MAINTENANCE_BATCH_LIMIT;
    delete process.env.OCCURRENCE_MAINTENANCE_THRESHOLD_DAYS;
  });

  it('runs the maintenance pass and then emits a dry-run health snapshot', async () => {
    const {
      MongoDbClient,
      getConfigValue,
      EventOccurrenceMaintenanceService,
      emitOccurrenceMaintenanceFailureMetric,
      emitOccurrenceMaintenanceHealthMetrics,
      emitOccurrenceMaintenanceRunMetrics,
      maintainEventOccurrencesHandler,
    } = await loadAll();
    (EventOccurrenceMaintenanceService.maintainAllOccurrenceWindows as jest.Mock)
      .mockResolvedValueOnce({
        processedSeriesCount: 5,
        syncedSeriesCount: 2,
        missingSeriesCount: 1,
        toppedUpSeriesCount: 1,
        metadataRepairSeriesCount: 0,
        driftedOccurrenceCount: 1,
        reconciledOccurrenceCount: 1,
        skippedSeriesCount: 2,
        syncedSeriesIds: ['series-1', 'series-2'],
        dryRun: false,
        batchesProcessed: 1,
      })
      .mockResolvedValueOnce({
        processedSeriesCount: 5,
        syncedSeriesCount: 0,
        missingSeriesCount: 0,
        toppedUpSeriesCount: 0,
        metadataRepairSeriesCount: 0,
        driftedOccurrenceCount: 0,
        reconciledOccurrenceCount: 0,
        skippedSeriesCount: 5,
        syncedSeriesIds: [],
        dryRun: true,
        batchesProcessed: 1,
      });
    process.env.OCCURRENCE_MAINTENANCE_BATCH_LIMIT = '250';
    process.env.OCCURRENCE_MAINTENANCE_THRESHOLD_DAYS = '21';

    await maintainEventOccurrencesHandler({}, context);

    expect(getConfigValue).toHaveBeenCalledWith('MONGO_DB_URL');
    expect(MongoDbClient.connectToDatabase).toHaveBeenCalledWith('mongodb://test');
    expect(EventOccurrenceMaintenanceService.maintainAllOccurrenceWindows).toHaveBeenNthCalledWith(1, {
      limit: 250,
      thresholdDays: 21,
      dryRun: false,
    });
    expect(EventOccurrenceMaintenanceService.maintainAllOccurrenceWindows).toHaveBeenNthCalledWith(2, {
      limit: 250,
      thresholdDays: 21,
      dryRun: true,
    });
    expect(emitOccurrenceMaintenanceRunMetrics).toHaveBeenCalledTimes(1);
    expect(emitOccurrenceMaintenanceHealthMetrics).toHaveBeenCalledTimes(1);
    expect(emitOccurrenceMaintenanceFailureMetric).not.toHaveBeenCalled();
  });

  it('emits a failure metric and rethrows when the maintenance run fails', async () => {
    const {
      EventOccurrenceMaintenanceService,
      emitOccurrenceMaintenanceFailureMetric,
      emitOccurrenceMaintenanceHealthMetrics,
      emitOccurrenceMaintenanceRunMetrics,
      maintainEventOccurrencesHandler,
    } = await loadAll();
    (EventOccurrenceMaintenanceService.maintainAllOccurrenceWindows as jest.Mock).mockRejectedValueOnce(
      new Error('maintenance failed'),
    );

    await expect(maintainEventOccurrencesHandler({}, context)).rejects.toThrow('maintenance failed');

    expect(emitOccurrenceMaintenanceFailureMetric).toHaveBeenCalledTimes(1);
    expect(emitOccurrenceMaintenanceRunMetrics).not.toHaveBeenCalled();
    expect(emitOccurrenceMaintenanceHealthMetrics).not.toHaveBeenCalled();
  });
});
