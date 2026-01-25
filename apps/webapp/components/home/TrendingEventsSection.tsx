'use client';
import { Box, Button, Typography, Card, CardContent, Skeleton, Stack } from '@mui/material';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GetAllEventsDocument } from '@/data/graphql/query/Event/query';
import EventTileGrid from '../events/EventTileGrid';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import EventBoxSkeleton from '../events/eventBox/EventBoxSkeleton';

export default function TrendingEventsSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error } = useQuery(GetAllEventsDocument, {
    variables: { options: {} },
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  const events = (data?.readEvents ?? []).slice().sort((a, b) => (b.rsvpCount ?? 0) - (a.rsvpCount ?? 0));
  const isLoading = loading || !data;

  return (
    <Box sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 1, md: 2 } }}>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: { xs: 1, md: 2 }, fontSize: { xs: '1.1rem', md: '1.25rem' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Trending Events
          <Button color="secondary" component={Link} href="/events" size="small">
            See all events
          </Button>
        </Box>
      </Typography>
      {isLoading ? (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          {[1, 2].map((i) => (
            <EventBoxSkeleton key={i} />
          ))}
        </Stack>
      ) : error ? (
        <Typography color="error">Failed to load trending events.</Typography>
      ) : events.length === 0 ? (
        <Typography color="text.secondary">No trending events right now. Check back soon!</Typography>
      ) : (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          <EventTileGrid events={events.slice(0, 4)} loading={loading} />
        </Stack>
      )}
    </Box>
  );
}
