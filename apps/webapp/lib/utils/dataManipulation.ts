import { GetAllEventsQuery } from '../graphql/types/graphql';

export const groupEventsByCategory = (
  events: GetAllEventsQuery,
): { [category: string]: any[] } => {
  const groupedEvents: { [category: string]: any[] } = {};

  events.readEvents?.forEach((event) => {
    event?.eventCategory.forEach((category: string) => {
      // Check if the category exists in the groupedEvents object
      if (!groupedEvents[category]) {
        // If not, initialize it with an empty array
        groupedEvents[category] = [];
      }
      // Push the event to the corresponding category array
      groupedEvents[category].push(event);
    });
  });

  return groupedEvents;
};
