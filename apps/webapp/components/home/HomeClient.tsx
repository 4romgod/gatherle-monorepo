'use client';

import { useQuery } from '@apollo/client';
import { Box, Container } from '@mui/material';
import { GetAllEventCategoriesDocument, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { HeroSection, CategoryExplorer } from '@/components/home';
import EventCarousel from '@/components/events/carousel';
import EventCarouselSkeleton from '@/components/events/carousel/EventCarouselSkeleton';
import type { EventPreview } from '@/data/graphql/query/Event/types';

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
            <EventCarouselSkeleton
              title="Featured Events"
              itemCount={5}
            />
          ) : (
            <EventCarousel
              events={featuredEvents}
              title="Featured Events"
              autoplay={false}
              autoplayInterval={6000}
              itemWidth={260}
              showIndicators
              viewAllEventsButton
            />
          )}
        </Container>
      </Box>
      <CategoryExplorer categories={eventCategories} isLoading={categoriesLoading} />
    </Box>
  );
}
