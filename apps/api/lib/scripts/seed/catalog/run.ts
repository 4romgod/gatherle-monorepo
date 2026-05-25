import { EventCategoryDAO } from '@/mongodb/dao';
import { eventCategoryCatalogData, eventCategoryGroupCatalogData } from '@/mongodb/data/catalog';
import { logger } from '@/utils/logger';
import type { EventCategory } from '@gatherle/commons/types';
import { seedEventCategories, seedEventCategoryGroups } from '../shared/catalog';

export async function runCatalogSeed(): Promise<EventCategory[]> {
  logger.info('Starting event catalog seed...');

  await seedEventCategories(eventCategoryCatalogData);
  const eventCategories = await EventCategoryDAO.readEventCategories();
  await seedEventCategoryGroups(eventCategoryGroupCatalogData, eventCategories);

  logger.info('Completed event catalog seed.');
  return eventCategories;
}

export async function readSeededCatalogOrThrow(): Promise<EventCategory[]> {
  const eventCategories = await EventCategoryDAO.readEventCategories();

  if (eventCategories.length === 0) {
    throw new Error('Event catalog is empty. Run "npm run seed:catalog -w @gatherle/api" first.');
  }

  return eventCategories;
}
