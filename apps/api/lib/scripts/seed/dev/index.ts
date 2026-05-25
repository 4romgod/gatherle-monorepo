import { logger } from '@/utils/logger';
import { runSeedTask } from '../shared/database';
import { runDevSeed } from './run';

runSeedTask(runDevSeed).catch((error) => {
  logger.error('An error occurred while attempting to seed dev data:', error);
});
