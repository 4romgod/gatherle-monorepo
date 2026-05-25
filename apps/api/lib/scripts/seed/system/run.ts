import { systemUsers } from '@/mongodb/data/system';
import { logger } from '@/utils/logger';
import { readSeededCatalogOrThrow } from '../catalog/run';
import { ensureSystemUsers } from '../shared/users';

export async function runSystemUserSeed() {
  logger.info('Starting system-user seed...');

  const eventCategories = await readSeededCatalogOrThrow();

  await ensureSystemUsers(systemUsers, {
    eventCategoryIds: eventCategories.map((category) => category.eventCategoryId!),
  });

  logger.info('Completed system-user seed.');
}
