import { Event, EventCategory, GetAllEventsQuery } from '../../data/graphql/types/graphql';

type GroupedEventsByCategoryProps = {
  [categoryName: string]: Event[];
};

export const groupEventsByCategory = (events: GetAllEventsQuery): GroupedEventsByCategoryProps => {
  const groupedEvents: GroupedEventsByCategoryProps = {};

  events.readEvents.forEach((event: Event) => {
    event.eventCategoryList.forEach((category: EventCategory) => {
      if (!groupedEvents[category.name]) {
        groupedEvents[category.name] = [];
      }
      groupedEvents[category.name].push(event);
    });
  });

  return groupedEvents;
};
