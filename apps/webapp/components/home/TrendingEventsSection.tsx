'use client';

import Link from 'next/link';
import { Box, Button, Typography, Stack } from '@mui/material';
import { useQuery } from '@apollo/client';
import { GetTrendingEventsDocument } from '@/data/graphql/query/Event/query';
import EventTileGrid from '../events/EventTileGrid';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import EventBoxSkeleton from '../events/eventBox/EventBoxSkeleton';

export default function TrendingEventsSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error } = useQuery(GetTrendingEventsDocument, {
    variables: { limit: 4 },
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  const events = data?.readTrendingEvents ?? [];
  const isLoading = loading && events.length === 0;

  return (
    <Box sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 1, md: 2 } }}>
      <Box sx={{ mb: { xs: 1, md: 2 } }}>
        <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.08em' }}>
          Momentum watch
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
            Trending events
          </Typography>
          <Button color="secondary" component={Link} href="/events" size="small">
            See all events
          </Button>
        </Box>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          These are the public events already building visible social proof.
        </Typography>
      </Box>
      {isLoading ? (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          {[1, 2].map((i) => (
            <EventBoxSkeleton key={i} />
          ))}
        </Stack>
      ) : error ? (
        <Typography color="error">Failed to load trending events.</Typography>
      ) : events.length === 0 ? (
        <Typography color="text.secondary">
          Nothing has broken away from the pack yet. Check back soon as more events start picking up traction.
        </Typography>
      ) : (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          <EventTileGrid events={events} loading={loading} />
        </Stack>
      )}
    </Box>
  );
}
