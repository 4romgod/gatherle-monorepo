import { logger } from '@/utils/logger';
import { runSeedTask } from '../shared/database';
import { runMockDataSeed } from './run';

runSeedTask(runMockDataSeed).catch((error) => {
  logger.error('An error occurred while attempting to seed mock data:', error);
});
