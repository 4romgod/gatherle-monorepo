'use client';

import { Box, Typography, Stack } from '@mui/material';
import { useSession } from 'next-auth/react';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';
import EventBoxSm from '@/components/events/eventBoxSm';
import EventBoxSmSkeleton from '@/components/events/eventBoxSm/EventBoxSmSkeleton';
import { getEventPreviewKey } from '@/components/events/event-preview-utils';
import { ROUTES } from '@/lib/constants';
import { useMyEventOccurrenceRsvps } from '@/hooks/useMyEventOccurrenceRsvps';

export default function UpcomingRsvpsSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const { error, loading, upcomingEvents } = useMyEventOccurrenceRsvps(token, false);

  return (
    <Box sx={{ mt: 4, mb: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Your Upcoming RSVPs
      </Typography>
      {loading ? (
        <CarouselSkeleton itemCount={3} renderSkeletonItem={() => <EventBoxSmSkeleton />} />
      ) : error ? (
        <Typography color="error">Failed to load your RSVPs.</Typography>
      ) : upcomingEvents.length === 0 ? (
        <Typography color="text.secondary">No upcoming RSVPs. RSVP to events to see them here!</Typography>
      ) : (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          <Carousel
            items={upcomingEvents}
            itemKey={(event) => getEventPreviewKey(event)}
            viewAllButton={{ href: ROUTES.EVENTS.ROOT }}
            renderItem={(event) => <EventBoxSm event={event} />}
          />
        </Stack>
      )}
    </Box>
  );
}
