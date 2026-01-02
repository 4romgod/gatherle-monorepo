"use client";

import { AvatarGroup, Box, Card, Skeleton, Stack } from '@mui/material';
import React from 'react';

type EventTileSkeletonProps = {
  count?: number;
};

function EventTileSkeleton() {
  return (
    <Card
      sx={{
        p: { xs: 0.75, sm: 1 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '170px 1fr' },
        gap: 1,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'none',
        position: 'relative',
        minHeight: { xs: 220, sm: 260 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: { xs: 150, sm: 210 },
          width: { xs: '100%', sm: 170 },
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Skeleton variant="rectangular" width="100%" height="100%" animation="wave" />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%)',
          }}
        />
      </Box>

      <Stack spacing={0.5}>
        <Skeleton variant="text" width="25%" height={18} animation="wave" />
        <Skeleton variant="text" width="70%" height={26} animation="wave" />
        <Skeleton variant="text" width="50%" height={18} animation="wave" />
        <Skeleton variant="text" width="65%" height={18} animation="wave" />
        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={28} height={28} animation="wave" />
          <Skeleton variant="text" width="35%" height={16} animation="wave" />
        </Stack>
        <AvatarGroup max={4}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={`participant-skeleton-${index}`}
              variant="circular"
              width={28}
              height={28}
              animation="wave"
            />
          ))}
        </AvatarGroup>
        <Skeleton variant="text" width="40%" height={18} animation="wave" />
      </Stack>

      <Stack direction="row" spacing={1}>
        <Skeleton variant="circular" width={32} height={32} animation="wave" />
        <Skeleton variant="circular" width={32} height={32} animation="wave" />
        <Skeleton variant="circular" width={32} height={32} animation="wave" />
      </Stack>
    </Card>
  );
}

export default function EventTileSkeletonGrid({ count = 3 }: EventTileSkeletonProps) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <EventTileSkeleton key={`event-skeleton-${index}`} />
      ))}
    </Stack>
  );
}
