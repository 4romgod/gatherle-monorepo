'use client';

import { useQuery } from '@apollo/client';
import { Box, Container, Typography } from '@mui/material';
import { GetAllEventCategoriesDocument, GetAllEventsDocument, SortOrderInput } from '@/data/graphql/types/graphql';
import { HeroSection, CategoryExplorer, ValuePropositionSection, NearbyEventsSection } from '@/components/home';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';
import EventBoxSm from '@/components/events/eventBoxSm';
import EventBoxSmSkeleton from '@/components/events/eventBoxSm/EventBoxSmSkeleton';
import type { EventPreview } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';

export default function HomeClient() {
  const { data: trendingEventsData, loading: trendingEventsLoading } = useQuery(GetAllEventsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      options: {
        sort: [{ field: 'rsvpCount', order: SortOrderInput.Desc }],
        pagination: { limit: 6 },
      },
    },
  });

  const { data: featuredEventsData, loading: featuredEventsLoading } = useQuery(GetAllEventsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      options: {
        sort: [{ field: 'savedByCount', order: SortOrderInput.Desc }],
        pagination: { limit: 6 },
      },
    },
  });

  const { data: categoriesData, loading: categoriesLoading } = useQuery(GetAllEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const trendingEvents: EventPreview[] = (trendingEventsData?.readEvents ?? []) as EventPreview[];
  const featuredEvents: EventPreview[] = (featuredEventsData?.readEvents ?? []) as EventPreview[];

  const heroEvent = trendingEvents[0] ?? null;

  const eventCategories = categoriesData?.readEventCategories ?? [];

  // const totalEvents = 0;
  // const totalRsvps = 0;

  // const cityCounts: Record<string, number> = {};
  // trendingEvents.forEach((event) => {
  //   const location = event.location?.address;
  //   if (!location?.city) {
  //     return;
  //   }
  //   const cityLabel = [location.city, location.state].filter(Boolean).join(', ');
  //   cityCounts[cityLabel] = (cityCounts[cityLabel] ?? 0) + 1;
  // });

  // const topCities = Object.entries(cityCounts)
  //   .map(([city, count]) => ({ city, count }))
  //   .sort((a, b) => b.count - a.count)
  //   .slice(0, 3);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
      <HeroSection heroEvent={heroEvent} isLoading={trendingEventsLoading} />
      <ValuePropositionSection />
      <NearbyEventsSection />

      <Box
        id="trending-events"
        sx={{
          backgroundColor: 'background.paper',
          py: { xs: 5, md: 7 },
        }}
      >
        <Container>
          {trendingEventsLoading ? (
            <CarouselSkeleton title="Trending Events" itemCount={5} renderSkeletonItem={() => <EventBoxSmSkeleton />} />
          ) : trendingEvents.length > 0 ? (
            <Carousel
              items={trendingEvents}
              title="Trending Events"
              autoplay={false}
              autoplayInterval={6000}
              itemWidth={260}
              showIndicators
              viewAllButton={{ href: ROUTES.EVENTS.ROOT, label: 'Browse all events' }}
              renderItem={(event) => <EventBoxSm event={event} />}
            />
          ) : (
            <Typography align="center" color="text.secondary">
              Trending events are on their way—check back soon to discover the latest gatherings.
            </Typography>
          )}
        </Container>
      </Box>

      <Box
        id="featured-events"
        sx={{
          backgroundColor: 'background.paper',
          py: { xs: 5, md: 7 },
        }}
      >
        <Container>
          {featuredEventsLoading ? (
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

      {/* <SocialProofSection
        topCities={topCities}
        totalEvents={totalEvents}
        totalRsvps={totalRsvps}
        loading={trendingEventsLoading}
      /> */}
    </Box>
  );
}
