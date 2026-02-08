'use client';

import Carousel from './Carousel';
import EventBoxSm from '@/components/events/eventBoxSm';
import { EventPreview } from '@/data/graphql/query/Event/types';

interface EventPreviewCarouselProps {
  events: EventPreview[];
}

export default function EventPreviewCarousel({ events }: EventPreviewCarouselProps) {
  if (events.length === 0) {
    return null;
  }

  const getKey = (event: EventPreview, index: number) => event.eventId ?? event.slug ?? index;

  return (
    <Carousel
      items={events}
      title=""
      autoplay={true}
      autoplayInterval={6000}
      itemWidth={350}
      showIndicators={true}
      itemKey={getKey}
      renderItem={(event) => <EventBoxSm event={event} />}
    />
  );
}
