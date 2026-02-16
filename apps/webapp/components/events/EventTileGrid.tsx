'use client';

import React from 'react';
import { Box } from '@mui/material';
import EventBox from '@/components/events/eventBox';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { EventPreview } from '@/data/graphql/query/Event/types';
import EventTileSkeletonGrid from './EventTileSkeleton';

export type EventTileGridProps = {
  events: EventPreview[];
  loading?: boolean;
  skeletonCount?: number;
};

export default function EventTileGrid({ events, loading = false, skeletonCount = 3 }: EventTileGridProps) {
  if (loading) {
    return <EventTileSkeletonGrid count={skeletonCount} />;
  }

  const handleLinkClick = (e: React.MouseEvent) => {
    // Prevent Link navigation if clicking on an interactive element (buttons, menus, etc.)
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, [role="button"], [role="menuitem"], [data-card-interactive="true"]');
    if (isInteractive) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <Box component="div" display="flex" flexDirection="column" gap={2}>
      {events.map((event) => (
        <Box component="div" key={`EventTileGrid.${event.eventId}`}>
          <Link href={ROUTES.EVENTS.EVENT(event.slug)} onClick={handleLinkClick}>
            <EventBox event={event} />
          </Link>
        </Box>
      ))}
    </Box>
  );
}
