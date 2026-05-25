import { logger } from '@/utils/logger';
import { runSeedTask } from '../shared/database';
import { runCatalogSeed } from './run';

runSeedTask(async () => {
  await runCatalogSeed();
}).catch((error) => {
  logger.error('An error occurred while attempting to seed the event catalog:', error);
});
