import { logger } from '@/utils/logger';
import { runSeedTask } from '../shared/database';
import { runSystemUserSeed } from './run';

runSeedTask(runSystemUserSeed).catch((error) => {
  logger.error('An error occurred while attempting to seed system users:', error);
});
