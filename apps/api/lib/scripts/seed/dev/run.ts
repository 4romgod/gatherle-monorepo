import { logger } from '@/utils/logger';
import { runCatalogSeed } from '../catalog/run';
import { runMockDataSeed } from '../mock/run';
import { runSystemUserSeed } from '../system/run';

export async function runDevSeed() {
  logger.info('Starting dev seed...');

  await runCatalogSeed();
  await runSystemUserSeed();
  await runMockDataSeed();

  logger.info('Completed dev seed.');
}
