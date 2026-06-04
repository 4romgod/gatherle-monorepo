'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import { GetRecommendedFeedDocument } from '@/data/graphql/query/Feed/query';
import type { RecommendedFeedEventPreview, RecommendedFeedOccurrencePreview } from '@/data/graphql/query/Feed/types';
import EventTileGrid from '@/components/events/EventTileGrid';
import EventBoxSkeleton from '@/components/events/eventBox/EventBoxSkeleton';
import type { AnyEventPreview } from '@/components/events/event-preview-utils';
import { useMyEventOccurrenceRsvps } from '@/hooks/useMyEventOccurrenceRsvps';
import { excludeAlreadyRsvpdRecommendations } from '@/lib/utils/home-feed';

export default function RecommendedSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const { upcomingEvents } = useMyEventOccurrenceRsvps(token, false, { enabled: Boolean(token) });

  const { data, loading, error } = useQuery(GetRecommendedFeedDocument, {
    variables: { limit: 4, skip: 0 },
    fetchPolicy: 'cache-and-network',
    context: { headers: getAuthHeader(token) },
    skip: !token,
  });

  const events = useMemo(
    () =>
      excludeAlreadyRsvpdRecommendations(
        (data?.readRecommendedFeed ?? [])
          .map((item) => item.representativeOccurrence ?? item.event)
          .filter((event): event is RecommendedFeedOccurrencePreview | RecommendedFeedEventPreview => event != null)
          .filter((event): event is AnyEventPreview => event != null),
        upcomingEvents,
      ),
    [data?.readRecommendedFeed, upcomingEvents],
  );

  const isLoading = !token || loading;

  return (
    <Box sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 1, md: 2 } }}>
      <Box sx={{ mb: { xs: 1, md: 2 } }}>
        <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.08em' }}>
          For your taste
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
            Recommended for you
          </Typography>
          <Button color="secondary" component={Link} href="/events" size="small">
            See all events
          </Button>
        </Box>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          These picks lean on timing, popularity, and the event patterns your account keeps reacting to.
        </Typography>
      </Box>
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
          Follow hosts, save a few interesting events, or RSVP to something that fits your week to sharpen this feed.
        </Typography>
      ) : (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          <EventTileGrid events={events} loading={isLoading} />
        </Stack>
      )}
    </Box>
  );
}
