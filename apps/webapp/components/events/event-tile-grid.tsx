'use client';

import React from 'react';
import { Box } from '@mui/material';
import EventBox from '@/components/events/event-box';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { EventPreview } from '@/data/graphql/query/Event/types';
import EventTileSkeletonGrid from './event-tile-skeleton';

export type EventTileGridProps = {
  events: EventPreview[];
  loading?: boolean;
  skeletonCount?: number;
};

export default function EventTileGrid({ events, loading = false, skeletonCount = 3 }: EventTileGridProps) {
  if (loading) {
    return <EventTileSkeletonGrid count={skeletonCount} />;
  }

  return (
    <Box component="div" display="flex" flexDirection="column" gap={2}>
      {events.map(event => (
        <Box component="div" key={`EventTileGrid.${event.eventId}`}>
          <Link href={ROUTES.EVENTS.EVENT(event.slug)}>
            <EventBox event={event} />
          </Link>
        </Box>
      ))}
    </Box>
  );
}
