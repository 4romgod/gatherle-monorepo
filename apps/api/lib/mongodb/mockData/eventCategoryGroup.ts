import type { CreateEventCategoryGroupInput } from '@gatherle/commons/types';

import eventCategories from './eventCategory';

type EventCategoryGroupDefinition = {
  name: string;
  categoryNames: string[];
};

const eventCategoryMap = new Map(eventCategories.map((category) => [category.name, category]));

const resolveEventCategory = (categoryName: string) => {
  const category = eventCategoryMap.get(categoryName);
  if (!category) {
    throw new Error(`Event category not found: ${categoryName}`);
  }
  return category;
};

const eventCategoryGroupDefinitions: EventCategoryGroupDefinition[] = [
  {
    name: 'Entertainment',
    categoryNames: ['Concerts', 'Nightlife', 'Film & Media', 'Gaming', 'Fashion & Beauty', 'Arts & Culture'],
  },
  {
    name: 'Professional & Learning',
    categoryNames: ['Conferences', 'Workshops', 'Networking', 'Technology', 'Startup & Business', 'Education'],
  },
  {
    name: 'Health & Wellness',
    categoryNames: ['Fitness', 'Health & Wellness', 'Family & Kids', 'Religious & Spiritual'],
  },
  {
    name: 'Food & Lifestyle',
    categoryNames: ['Food & Drink', 'Fashion & Beauty', 'Travel & Adventure', 'Arts & Culture'],
  },
  {
    name: 'Sports & Outdoors',
    categoryNames: ['Sports', 'Fitness', 'Travel & Adventure'],
  },
  {
    name: 'Community & Causes',
    categoryNames: ['Charity & Causes', 'Religious & Spiritual', 'Family & Kids', 'Education'],
  },
];

const eventCategoryGroupMockData: CreateEventCategoryGroupInput[] = eventCategoryGroupDefinitions.map(
  ({ name, categoryNames }) => ({
    name,
    eventCategories: categoryNames.map((categoryName) => {
      resolveEventCategory(categoryName);
      return categoryName;
    }),
  }),
);

export default eventCategoryGroupMockData;
