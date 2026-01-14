'use client';

import React from 'react';
import { Box, ListItem, ListItemAvatar, Skeleton, Stack } from '@mui/material';

interface FollowListItemSkeletonProps {
  count?: number;
}

function FollowListItemSkeleton() {
  return (
    <ListItem
      sx={{
        px: 2,
        py: 2,
        alignItems: 'flex-start',
      }}
    >
      <ListItemAvatar sx={{ mt: 0.5 }}>
        <Skeleton variant="circular" width={48} height={48} animation="wave" />
      </ListItemAvatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="60%" height={24} animation="wave" />
            <Skeleton variant="text" width="40%" height={20} animation="wave" />
            <Skeleton variant="text" width="85%" height={18} animation="wave" />
            <Skeleton variant="text" width="70%" height={18} animation="wave" />
          </Stack>

          <Skeleton variant="rounded" width={90} height={32} animation="wave" sx={{ borderRadius: 2 }} />
        </Stack>
      </Box>
    </ListItem>
  );
}

export default function FollowListSkeleton({ count = 5 }: FollowListItemSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <FollowListItemSkeleton key={`follow-list-skeleton-${index}`} />
      ))}
    </>
  );
}
