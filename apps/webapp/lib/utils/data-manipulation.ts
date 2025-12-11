import { Event, EventCategory } from '../../data/graphql/types/graphql';

type GroupedEventsByCategoryProps = {
  [categoryName: string]: Event[];
};

export const groupEventsByCategory = (events: Event[]): GroupedEventsByCategoryProps => {
  const groupedEvents: GroupedEventsByCategoryProps = {};

  events.forEach((event: Event) => {
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
