export const groupEventsByCategory = (
  events: any[],
): { [category: string]: any[] } => {
  const groupedEvents: { [category: string]: any[] } = {};

  events.forEach((event) => {
    // Iterate through each event category of the event
    event.eventCategory.forEach((category: any) => {
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
