import { EventCategoryDAO, EventCategoryGroupDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import type {
  CreateEventCategoryGroupInput,
  CreateEventCategoryInput,
  EventCategory,
} from '@gatherle/commons/server/types';

export async function seedEventCategories(categories: Array<CreateEventCategoryInput>) {
  logger.info('Ensuring event categories exist...');

  const existing = await EventCategoryDAO.readEventCategories();

  for (const category of categories) {
    const found = existing.find((item) => item.name === category.name);
    if (found) {
      continue;
    }

    await EventCategoryDAO.create(category);
    logger.info(`   Created event category "${category.name}".`);
  }
}

export async function seedEventCategoryGroups(
  eventCategoryGroupsInputList: Array<CreateEventCategoryGroupInput>,
  eventCategoryList: Array<EventCategory>,
) {
  logger.info('Ensuring event category groups exist...');

  const existingGroups = await EventCategoryGroupDAO.readEventCategoryGroups();

  for (const groupInput of eventCategoryGroupsInputList) {
    const found = existingGroups.find((group) => group.name === groupInput.name);
    if (found) {
      continue;
    }

    const resolvedCategoryIds = groupInput.eventCategories.map((categoryName) => {
      const match = eventCategoryList.find((category) => category.name === categoryName);
      if (!match) {
        throw new Error(`Event category not found: ${categoryName}`);
      }
      return match.eventCategoryId;
    });

    await EventCategoryGroupDAO.create({
      ...groupInput,
      eventCategories: resolvedCategoryIds,
    });
    logger.info(`   Created event category group "${groupInput.name}".`);
  }
}
