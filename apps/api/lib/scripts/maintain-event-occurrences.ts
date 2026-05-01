import { getConfigValue, MongoDbClient } from '@/clients';
import { SECRET_KEYS, validateEnv } from '@/constants';
import EventOccurrenceMaintenanceService from '@/services/eventOccurrenceMaintenance';
import { logger } from '@/utils/logger';

interface MaintenanceScriptOptions {
  limit?: number;
  afterEventId?: string;
  thresholdDays?: number;
  dryRun: boolean;
  eventSeriesId?: string;
}

function parseNumberArg(value: string | undefined, flagName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flagName} must be a number.`);
  }

  return parsed;
}

function parseArgs(argv: string[]): MaintenanceScriptOptions {
  const options: MaintenanceScriptOptions = {
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--limit':
        options.limit = parseNumberArg(argv[index + 1], '--limit');
        index += 1;
        break;
      case '--after-event-id':
        options.afterEventId = argv[index + 1];
        index += 1;
        break;
      case '--threshold-days':
        options.thresholdDays = parseNumberArg(argv[index + 1], '--threshold-days');
        index += 1;
        break;
      case '--event-series-id':
        options.eventSeriesId = argv[index + 1];
        index += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function main() {
  validateEnv();
  const options = parseArgs(process.argv.slice(2));
  const mongoDbUrl = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);

  await MongoDbClient.connectToDatabase(mongoDbUrl);
  logger.info('Connected to MongoDB');

  try {
    const result = options.eventSeriesId
      ? await EventOccurrenceMaintenanceService.maintainSeriesWindow(options.eventSeriesId, {
          thresholdDays: options.thresholdDays,
          dryRun: options.dryRun,
        })
      : await EventOccurrenceMaintenanceService.maintainAllOccurrenceWindows({
          limit: options.limit,
          afterEventId: options.afterEventId,
          thresholdDays: options.thresholdDays,
          dryRun: options.dryRun,
        });

    logger.info('Event occurrence maintenance completed.', result);
  } finally {
    await MongoDbClient.disconnectFromDatabase();
    logger.info('Disconnected from MongoDB');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Event occurrence maintenance failed.', { error });
    process.exit(1);
  });
