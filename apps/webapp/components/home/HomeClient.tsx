'use client';

import { useQuery } from '@apollo/client';
import { Box, Container, Stack, Typography } from '@mui/material';
import { GetEventCategoriesDocument, GetEventsDocument, SortOrderInput } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';
import QueryErrorState from '@/components/errors/QueryErrorState';
import { HeroSection, CategoryExplorer, NearbyEventsSection } from '@/components/home';
import HomeBrowseSection from '@/components/home/HomeBrowseSection';
import ToolbarEventSearchAction from '@/components/navigation/ToolbarEventSearchAction';
import { getAuthHeader } from '@/lib/utils/auth';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';
import EventBoxSm from '@/components/events/eventBoxSm';
import EventBoxSmSkeleton from '@/components/events/eventBoxSm/EventBoxSmSkeleton';
import { getEventPreviewKey } from '@/components/events/event-preview-utils';
import { useMemo } from 'react';
import type { EventOccurrencePreview, EventPreview } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';
import { buildDefaultOccurrenceDateRange, dedupeOccurrencesBySeries } from '@/lib/utils/occurrence-query';
import { GetEventOccurrencesDocument } from '@/data/graphql/query';
import { useToolbarAction } from '@/hooks/useToolbarAction';
import { useFollowingUserIds } from '@/hooks/useFollow';

export default function HomeClient() {
  const { data: session } = useSession();
  const followingUserIds = useFollowingUserIds();
  const toolbarAction = useMemo(
    () => <ToolbarEventSearchAction placeholder="Search events, categories, or locations..." />,
    [],
  );
  useToolbarAction(toolbarAction);
  const authContext = { headers: getAuthHeader(session?.user?.token) };
  const isAuthenticated = Boolean(session?.user?.userId && session?.user?.token);

  const {
    data: trendingEventsData,
    error: trendingEventsError,
    loading: trendingEventsLoading,
    refetch: refetchTrendingEvents,
  } = useQuery(GetEventOccurrencesDocument, {
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

  const {
    data: featuredEventsData,
    error: featuredEventsError,
    loading: featuredEventsLoading,
    refetch: refetchFeaturedEvents,
  } = useQuery(GetEventsDocument, {
    fetchPolicy: 'cache-and-network',
    context: authContext,
    variables: {
      options: {
        sort: [{ field: 'savedByCount', order: SortOrderInput.Desc }],
        pagination: { limit: 6 },
      },
    },
  });

  const {
    data: categoriesData,
    error: categoriesError,
    loading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery(GetEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const trendingEvents = useMemo(() => {
    const occurrences = (trendingEventsData?.readEventOccurrences ?? []) as EventOccurrencePreview[];
    return dedupeOccurrencesBySeries(occurrences, 6);
  }, [trendingEventsData]);
  const featuredEvents: EventPreview[] = (featuredEventsData?.readEvents ?? []) as EventPreview[];
  const isTrendingInitialLoading = trendingEventsLoading && !trendingEventsData;
  const isFeaturedInitialLoading = featuredEventsLoading && !featuredEventsData;
  const isCategoriesInitialLoading = categoriesLoading && !categoriesData;

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
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.default',
      }}
    >
      <HeroSection heroEvent={heroEvent} isLoading={trendingEventsLoading} />

      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          <Stack spacing={{ xs: 5, md: 6 }}>
            <NearbyEventsSection />

            <Box id="trending-events">
              {isTrendingInitialLoading ? (
                <CarouselSkeleton
                  title="Trending Events"
                  itemCount={5}
                  renderSkeletonItem={() => <EventBoxSmSkeleton />}
                />
              ) : trendingEventsError ? (
                <QueryErrorState
                  compact
                  error={trendingEventsError}
                  onRetry={() => void refetchTrendingEvents()}
                  resourceName="trending events"
                />
              ) : trendingEvents.length > 0 ? (
                <Carousel
                  items={trendingEvents}
                  itemKey={(event) => getEventPreviewKey(event)}
                  title="Trending Events"
                  autoplay={false}
                  autoplayInterval={6000}
                  showIndicators
                  viewAllButton={{ href: ROUTES.EVENTS.ROOT, label: 'Browse all events' }}
                  renderItem={(event) => <EventBoxSm event={event} followingUserIds={followingUserIds} />}
                />
              ) : (
                <Typography align="center" color="text.secondary">
                  Trending events are on their way—check back soon to discover the latest gatherings.
                </Typography>
              )}
            </Box>

            <Box id="featured-events">
              {isFeaturedInitialLoading ? (
                <CarouselSkeleton
                  title="Featured Events"
                  itemCount={5}
                  renderSkeletonItem={() => <EventBoxSmSkeleton />}
                />
              ) : featuredEventsError ? (
                <QueryErrorState
                  compact
                  error={featuredEventsError}
                  onRetry={() => void refetchFeaturedEvents()}
                  resourceName="featured events"
                />
              ) : (
                <Carousel
                  items={featuredEvents}
                  itemKey={(event) => getEventPreviewKey(event)}
                  title="Featured Events"
                  autoplay={false}
                  autoplayInterval={6000}
                  itemWidth={260}
                  showIndicators
                  viewAllButton={{ href: ROUTES.EVENTS.ROOT }}
                  renderItem={(event) => <EventBoxSm event={event} followingUserIds={followingUserIds} />}
                />
              )}
            </Box>

            <HomeBrowseSection isAuthenticated={isAuthenticated} />
          </Stack>
        </Container>
      </Box>

      {categoriesError ? (
        <Container maxWidth="md" sx={{ pb: { xs: 6, md: 8 } }}>
          <QueryErrorState
            compact
            error={categoriesError}
            onRetry={() => void refetchCategories()}
            resourceName="event categories"
          />
        </Container>
      ) : (
        <CategoryExplorer
          title={'Choose your kind of magic'}
          description={'Discover spaces built for music lovers, builders, founders, foodies, and everyone in between.'}
          categories={eventCategories}
          isLoading={isCategoriesInitialLoading}
        />
      )}

      {/* <SocialProofSection
        topCities={topCities}
        totalEvents={totalEvents}
        totalRsvps={totalRsvps}
        loading={trendingEventsLoading}
      /> */}
    </Box>
  );
}
