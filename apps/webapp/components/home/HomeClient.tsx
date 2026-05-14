'use client';

import { useQuery } from '@apollo/client';
import { alpha, Box, Container, Stack, Typography } from '@mui/material';
import { GetEventCategoriesDocument, GetEventsDocument, SortOrderInput } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';
import { HeroSection, CategoryExplorer, ValuePropositionSection, NearbyEventsSection } from '@/components/home';
import { getAuthHeader } from '@/lib/utils/auth';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';
import EventBoxSm from '@/components/events/eventBoxSm';
import EventBoxSmSkeleton from '@/components/events/eventBoxSm/EventBoxSmSkeleton';
import { useMemo } from 'react';
import type { EventOccurrencePreview, EventPreview } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';
import { buildDefaultOccurrenceDateRange, dedupeOccurrencesBySeries } from '@/lib/utils/occurrence-query';
import { GetEventOccurrencesDocument } from '@/data/graphql/query';

export default function HomeClient() {
  const { data: session } = useSession();
  const authContext = { headers: getAuthHeader(session?.user?.token) };

  const { data: trendingEventsData, loading: trendingEventsLoading } = useQuery(GetEventOccurrencesDocument, {
    fetchPolicy: 'cache-and-network',
    context: authContext,
    variables: {
      options: {
        dateRange: buildDefaultOccurrenceDateRange(),
        sort: [{ field: 'rsvpCount', order: SortOrderInput.Desc }],
        pagination: { limit: 48 },
      },
    },
  });

  const { data: featuredEventsData, loading: featuredEventsLoading } = useQuery(GetEventsDocument, {
    fetchPolicy: 'cache-and-network',
    context: authContext,
    variables: {
      options: {
        sort: [{ field: 'savedByCount', order: SortOrderInput.Desc }],
        pagination: { limit: 6 },
      },
    },
  });

  const { data: categoriesData, loading: categoriesLoading } = useQuery(GetEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const trendingEvents = useMemo(() => {
    const occurrences = (trendingEventsData?.readEventOccurrences ?? []) as EventOccurrencePreview[];
    return dedupeOccurrencesBySeries(occurrences, 6);
  }, [trendingEventsData]);
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
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.default',
        backgroundImage: `radial-gradient(circle at top, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 32%)`,
        backgroundRepeat: 'no-repeat',
      })}
    >
      <HeroSection heroEvent={heroEvent} isLoading={trendingEventsLoading} />

      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          <Stack spacing={{ xs: 5, md: 6 }}>
            <ValuePropositionSection />
            <NearbyEventsSection />

            <Box id="trending-events">
              {trendingEventsLoading ? (
                <CarouselSkeleton
                  title="Trending Events"
                  itemCount={5}
                  renderSkeletonItem={() => <EventBoxSmSkeleton />}
                />
              ) : trendingEvents.length > 0 ? (
                <Carousel
                  items={trendingEvents}
                  title="Trending Events"
                  autoplay={false}
                  autoplayInterval={6000}
                  showIndicators
                  viewAllButton={{ href: ROUTES.EVENTS.ROOT, label: 'Browse all events' }}
                  renderItem={(event) => <EventBoxSm event={event} />}
                />
              ) : (
                <Typography align="center" color="text.secondary">
                  Trending events are on their way—check back soon to discover the latest gatherings.
                </Typography>
              )}
            </Box>

            <Box id="featured-events">
              {featuredEventsLoading ? (
                <CarouselSkeleton
                  title="Featured Events"
                  itemCount={5}
                  renderSkeletonItem={() => <EventBoxSmSkeleton />}
                />
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
            </Box>
          </Stack>
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
