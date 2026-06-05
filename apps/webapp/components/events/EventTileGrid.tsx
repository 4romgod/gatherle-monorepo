'use client';

import React from 'react';
import { Box } from '@mui/material';
import EventBox from '@/components/events/eventBox';
import Link from 'next/link';
import EventTileSkeletonGrid from './EventTileSkeleton';
import { AnyEventPreview, getEventPreviewHref, getEventPreviewKey } from '@/components/events/event-preview-utils';
import { useFollowingUserIds } from '@/hooks/useFollow';

export type EventTileGridProps = {
  events: AnyEventPreview[];
  loading?: boolean;
  skeletonCount?: number;
};

export default function EventTileGrid({ events, loading = false, skeletonCount = 3 }: EventTileGridProps) {
  const followingUserIds = useFollowingUserIds();

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
        <Box component="div" key={`EventTileGrid.${getEventPreviewKey(event)}`}>
          <Link href={getEventPreviewHref(event)} onClick={handleLinkClick}>
            <EventBox event={event} followingUserIds={followingUserIds} />
          </Link>
        </Box>
      ))}
    </Box>
  );
}
