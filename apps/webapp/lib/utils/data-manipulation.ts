import { EventType, EventCategoryType, GetAllEventsQuery } from '../../data/graphql/types/graphql';

type GroupedEventsByCategoryProps = {
  [categoryName: string]: EventType[];
};

export const groupEventsByCategory = (events: GetAllEventsQuery): GroupedEventsByCategoryProps => {
  const groupedEvents: GroupedEventsByCategoryProps = {};

  events.readEvents.forEach((event: EventType) => {
    event.eventCategory.forEach((category: EventCategoryType) => {
      if (!groupedEvents[category.name]) {
        groupedEvents[category.name] = [];
      }
      groupedEvents[category.name].push(event);
    });
  });

  return groupedEvents;
};
