'use client';

import { Box, Typography, Stack } from '@mui/material';
import { useQuery } from '@apollo/client';
import { GetMyRsvpsDocument } from '@/data/graphql/query/EventParticipant/query';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import EventCarousel from '../events/carousel';
import EventCarouselSkeleton from '../events/carousel/EventCarouselSkeleton';

export default function UpcomingRsvpsSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error } = useQuery(GetMyRsvpsDocument, {
    variables: { includeCancelled: false },
    skip: !token,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const rsvps = data?.myRsvps ?? [];
  const rsvpEvents = rsvps.map((rsvp) => rsvp.event).filter((event) => !!event);
  const isLoading = loading || !data;

  return (
    <Box sx={{ mt: 4, mb: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Your Upcoming RSVPs
      </Typography>
      {isLoading ? (
        <EventCarouselSkeleton itemCount={3} />
      ) : error ? (
        <Typography color="error">Failed to load your RSVPs.</Typography>
      ) : rsvps.length === 0 ? (
        <Typography color="text.secondary">No upcoming RSVPs. RSVP to events to see them here!</Typography>
      ) : (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          <EventCarousel events={rsvpEvents} />
        </Stack>
      )}
    </Box>
  );
}
