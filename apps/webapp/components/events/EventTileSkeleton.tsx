'use client';

import { Stack } from '@mui/material';
import React from 'react';
import EventBoxSkeleton from './eventBox/EventBoxSkeleton';

type EventTileSkeletonProps = {
  count?: number;
};

export default function EventTileSkeletonGrid({ count = 3 }: EventTileSkeletonProps) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <EventBoxSkeleton key={`event-skeleton-${index}`} />
      ))}
    </Stack>
  );
}
