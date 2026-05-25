import { logger } from '@/utils/logger';
import { runSeedTask } from '../shared/database';
import { runPublicEventSeed } from './run';

runSeedTask(runPublicEventSeed).catch((error) => {
  logger.error('An error occurred while attempting to seed public events:', error);
});
