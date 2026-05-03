'use client';

import { Box, Typography, Stack } from '@mui/material';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';
import { GetMyEventOccurrenceRsvpsDocument } from '@/data/graphql/types/graphql';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';
import EventBoxSm from '@/components/events/eventBoxSm';
import EventBoxSmSkeleton from '@/components/events/eventBoxSm/EventBoxSmSkeleton';
import {
  getEventPreviewKey,
  isEventPreviewUpcoming,
  projectOccurrenceRsvpToEventPreview,
} from '@/components/events/event-preview-utils';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';

export default function UpcomingRsvpsSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error } = useQuery(GetMyEventOccurrenceRsvpsDocument, {
    variables: { includeCancelled: false },
    skip: !token,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const rsvpEvents: EventOccurrencePreview[] = (data?.myEventOccurrenceRsvps ?? [])
    .map(projectOccurrenceRsvpToEventPreview)
    .filter((event): event is EventOccurrencePreview => event != null && isEventPreviewUpcoming(event))
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  return (
    <Box sx={{ mt: 4, mb: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Your Upcoming RSVPs
      </Typography>
      {loading ? (
        <CarouselSkeleton itemCount={3} renderSkeletonItem={() => <EventBoxSmSkeleton />} />
      ) : error ? (
        <Typography color="error">Failed to load your RSVPs.</Typography>
      ) : rsvpEvents.length === 0 ? (
        <Typography color="text.secondary">No upcoming RSVPs. RSVP to events to see them here!</Typography>
      ) : (
        <Stack gap={{ xs: 1.5, md: 2 }}>
          <Carousel
            items={rsvpEvents}
            itemKey={(event) => getEventPreviewKey(event)}
            viewAllButton={{ href: ROUTES.EVENTS.ROOT }}
            renderItem={(event) => <EventBoxSm event={event} />}
          />
        </Stack>
      )}
    </Box>
  );
}
