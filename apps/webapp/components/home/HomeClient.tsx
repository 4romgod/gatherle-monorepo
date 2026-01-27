'use client';

import { useQuery } from '@apollo/client';
import { Box, Container } from '@mui/material';
import { GetAllEventCategoriesDocument, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { HeroSection, CategoryExplorer } from '@/components/home';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';
import EventBoxSm from '@/components/events/eventBoxSm';
import EventBoxSmSkeleton from '@/components/events/eventBoxSm/EventBoxSmSkeleton';
import type { EventPreview } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';

export default function HomeClient() {
  // TODO: consider implementing pagination or lazy loading for events
  const { data: eventsData, loading: eventsLoading } = useQuery(GetAllEventsDocument, {
    fetchPolicy: 'cache-and-network',
  });
  // TODO: consider implementing pagination or lazy loading for events
  const { data: categoriesData, loading: categoriesLoading } = useQuery(GetAllEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const eventList: EventPreview[] = (eventsData?.readEvents ?? []) as EventPreview[];
  const featuredEvents = eventList.slice(0, 8);
  const heroEvent = eventList[0] ?? null;
  const eventCategories = categoriesData?.readEventCategories ?? [];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
      <HeroSection heroEvent={heroEvent} isLoading={eventsLoading} />
      <Box
        id="featured-events"
        sx={{
          backgroundColor: 'background.paper',
          py: { xs: 5, md: 7 },
        }}
      >
        <Container>
          {eventsLoading ? (
            <CarouselSkeleton title="Featured Events" itemCount={5} renderSkeletonItem={() => <EventBoxSmSkeleton />} />
          ) : (
            <Carousel
              items={featuredEvents}
              title="Featured Events"
              autoplay={false}
              autoplayInterval={6000}
              itemWidth={260}
              showIndicators
              viewAllButton={{ href: ROUTES.EVENTS.ROOT }}
              renderItem={(event) => <EventBoxSm event={event} />}
            />
          )}
        </Container>
      </Box>
      <CategoryExplorer
        title={'Choose your kind of magic'}
        description={'Discover spaces built for music lovers, builders, founders, foodies, and everyone in between.'}
        categories={eventCategories}
        isLoading={categoriesLoading}
      />
    </Box>
  );
}
