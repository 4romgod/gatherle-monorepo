'use client';

import { Card, CardContent, Skeleton, Stack } from '@mui/material';
import Surface from '@/components/core/Surface';

export default function VenueCardSkeleton() {
  return (
    <Surface
      component={Card}
      sx={{
        borderRadius: 3,
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={1}>
          <Skeleton variant="rectangular" width={80} height={22} />
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="40%" height={18} />
          <Skeleton variant="rectangular" width="100%" height={110} />
          <Skeleton variant="text" width="70%" height={18} />
        </Stack>
      </CardContent>
    </Surface>
  );
}
