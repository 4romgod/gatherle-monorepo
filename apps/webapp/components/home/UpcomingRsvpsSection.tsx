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
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.08em' }}>
          Your plans
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          Your upcoming RSVPs
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          The events you already committed to should stay visible without hunting for them.
        </Typography>
      </Box>
      {loading ? (
        <CarouselSkeleton itemCount={3} renderSkeletonItem={() => <EventBoxSmSkeleton />} />
      ) : error ? (
        <Typography color="error">Failed to load your RSVPs.</Typography>
      ) : upcomingEvents.length === 0 ? (
        <Typography color="text.secondary">
          Nothing is locked in yet. RSVP to an event you want to keep close and it will live here.
        </Typography>
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
