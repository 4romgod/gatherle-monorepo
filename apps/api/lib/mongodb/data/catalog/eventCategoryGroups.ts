import type { CreateEventCategoryGroupInput } from '@gatherle/commons/types';

import eventCategories from './eventCategories';

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
    name: 'Going Out',
    categoryNames: ['Live Music', 'Nightlife & Parties', 'Food & Markets', 'Networking & Socials'],
  },
  {
    name: 'Culture & Entertainment',
    categoryNames: ['Live Music', 'Arts & Theatre', 'Comedy', 'Food & Markets'],
  },
  {
    name: 'Business & Learning',
    categoryNames: [
      'Business & Entrepreneurship',
      'Tech & Innovation',
      'Workshops & Classes',
      'Conferences',
      'Networking & Socials',
    ],
  },
  {
    name: 'Active & Outdoors',
    categoryNames: ['Sports', 'Fitness & Wellness', 'Outdoors & Adventure'],
  },
  {
    name: 'Family & Community',
    categoryNames: ['Family & Kids', 'Community & Causes', 'Faith & Spirituality', 'Food & Markets'],
  },
];

const eventCategoryGroupCatalogData: CreateEventCategoryGroupInput[] = eventCategoryGroupDefinitions.map(
  ({ name, categoryNames }) => ({
    name,
    eventCategories: categoryNames.map((categoryName) => {
      resolveEventCategory(categoryName);
      return categoryName;
    }),
  }),
);

export default eventCategoryGroupCatalogData;
