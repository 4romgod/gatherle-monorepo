'use client';

import Link from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import { GetRecommendedFeedDocument } from '@/data/graphql/query/Feed/query';
import type { RecommendedFeedEventPreview } from '@/data/graphql/query/Feed/types';
import EventTileGrid from '@/components/events/EventTileGrid';
import EventBoxSkeleton from '@/components/events/eventBox/EventBoxSkeleton';

export default function RecommendedSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error } = useQuery(GetRecommendedFeedDocument, {
    variables: { limit: 4, skip: 0 },
    fetchPolicy: 'cache-and-network',
    context: { headers: getAuthHeader(token) },
    skip: !token,
  });

  const events = (data?.readRecommendedFeed ?? [])
    .map((item) => item.event)
    .filter((e): e is RecommendedFeedEventPreview => e != null);

  const isLoading = !token || loading;

  return (
    <Box sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 1, md: 2 } }}>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: { xs: 1, md: 2 }, fontSize: { xs: '1.1rem', md: '1.25rem' } }}
      >
        Recommended For You
        <Button color="secondary" component={Link} href="/events" size="small">
          See all events
        </Button>
      </Typography>
      {isLoading && !data ? (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          {[1, 2].map((i) => (
            <EventBoxSkeleton key={i} />
          ))}
        </Stack>
      ) : error ? (
        <Typography color="error">Failed to load recommendations.</Typography>
      ) : events.length === 0 ? (
        <Typography color="text.secondary">
          No recommendations yet. Follow more people and organizations to get personalized suggestions!
        </Typography>
      ) : (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          <EventTileGrid events={events} loading={isLoading} />
        </Stack>
      )}
    </Box>
  );
}
