'use client';
import { Box, Typography, Stack } from '@mui/material';
import { useQuery } from '@apollo/client';
import { GetAllEventsDocument } from '@/data/graphql/query/Event/query';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import EventCarousel from '@/components/events/carousel';
import EventCarouselSkeleton from '@/components/events/carousel/EventCarouselSkeleton';

// Helper: get this weekend's date range
function getThisWeekendRange() {
  const now = new Date();
  const day = now.getDay();
  // Friday (5) to Sunday (0)
  const friday = new Date(now);
  friday.setDate(now.getDate() + ((5 - day + 7) % 7));
  friday.setHours(0, 0, 0, 0);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);
  return { start: friday.toISOString(), end: sunday.toISOString() };
}

export default function NearbyEventsSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  // TODO For demo, use a static location (could use user profile or geolocation API)
  const location = {
    city: undefined,
    state: undefined,
    country: undefined,
    latitude: undefined,
    longitude: undefined,
    radiusKm: 50,
  };
  const { start, end } = getThisWeekendRange();
  const { data, loading, error } = useQuery(GetAllEventsDocument, {
    variables: {
      options: {
        location,
        dateFilterOption: undefined,
        customDate: start,
      },
    },
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  const events = data?.readEvents ?? [];
  const isLoading = loading || !data;

  return (
    <Box sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 1, md: 2 } }}>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: { xs: 1, md: 2 }, fontSize: { xs: '1.1rem', md: '1.25rem' } }}
      >
        Nearby / This Weekend
      </Typography>
      {isLoading ? (
        <EventCarouselSkeleton itemCount={3} />
      ) : error ? (
        <Typography color="error">Failed to load nearby events.</Typography>
      ) : events.length === 0 ? (
        <Typography color="text.secondary">No nearby events this weekend. Check back soon!</Typography>
      ) : (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          <EventCarousel events={events} />
        </Stack>
      )}
    </Box>
  );
}
