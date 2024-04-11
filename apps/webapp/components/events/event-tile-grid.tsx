import EventSmallBox from '@/components/events/event-small-box';
import { Event } from '@/lib/graphql/types/graphql';

export type EventTileGridProps = {
  eventsByCategory: {
    [category: string]: Event[];
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
        <div key={category}>
          {!hideCategories && (
            <h2 className="mb-3 mt-16 px-2 text-2xl sm:px-0">{category}</h2>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:max-w-none xl:grid-cols-3">
            {eventsByCategory[category].map((event) => (
              <EventSmallBox key={`${category}.${event.id}`} event={event} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
