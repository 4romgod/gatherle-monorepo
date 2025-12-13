import { EventCategory } from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';

type GroupedEventsByCategoryProps = {
  [categoryName: string]: EventPreview[];
};

export const groupEventsByCategory = (events: EventPreview[]): GroupedEventsByCategoryProps => {
  const groupedEvents: GroupedEventsByCategoryProps = {};

  events.forEach((event: EventPreview) => {
    if (!event.eventCategoryList?.length) {
      groupedEvents['All events'] = [...(groupedEvents['All events'] ?? []), event];
      return;
    }

    event.eventCategoryList.forEach((category: EventCategory) => {
      if (!groupedEvents[category.name]) {
        groupedEvents[category.name] = [];
      }
      groupedEvents[category.name].push(event);
    });
  });

  if (!Object.keys(groupedEvents).length && events.length) {
    groupedEvents['All events'] = events;
  }

  return groupedEvents;
};
