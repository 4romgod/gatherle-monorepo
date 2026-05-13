import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { Carousel } from '@/components/carousel/Carousel';
import { EventCard } from '@/components/events/EventCard';

type EventPreviewCarouselProps = {
  cardWidth: number;
  events: MobileEventOccurrence[];
  onPressEvent?: (event: MobileEventOccurrence) => void;
};

export function EventPreviewCarousel({ cardWidth, events, onPressEvent }: EventPreviewCarouselProps) {
  return (
    <Carousel
      data={events}
      itemWidth={cardWidth}
      keyExtractor={(event) => event.occurrenceId}
      renderItem={({ item }) => (
        <EventCard
          cardWidth="100%"
          occurrence={item}
          onPress={onPressEvent ? () => onPressEvent(item) : undefined}
          variant="featured"
        />
      )}
    />
  );
}
