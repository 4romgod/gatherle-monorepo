import EventLinkBox from '@/components/events/event-small-box';

export type EventTileGridProps = {
  eventsByCategory: {
    [category: string]: any[];
  };
  hideCategories?: boolean;
};

export default function EventTileGrid({
  eventsByCategory,
  hideCategories = false,
}: EventTileGridProps) {
  return (
    <>
      {Object.keys(eventsByCategory).map((category) => (
        <div key={category} className="space-y-8">
          {!hideCategories && <h2 className="h2">{category}</h2>}
          <div className="grid  grid-cols-1 gap-5 lg:max-w-none lg:grid-cols-2 xl:grid-cols-3">
            {eventsByCategory[category].map((event) => (
              <EventLinkBox key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
