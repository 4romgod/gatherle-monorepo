'use client';

import { Box, Typography, Skeleton, Stack } from '@mui/material';
import EventBoxSmSkeleton from '@/components/events/eventBoxSm/EventBoxSmSkeleton';

export default function EventCarouselSkeleton({
  title,
  itemCount = 3,
  viewAll = true,
}: {
  title?: string;
  itemCount?: number;
  viewAll?: boolean;
}) {
  return (
    <Box sx={{ width: '100%' }}>
      {(title || viewAll) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          {title ? (
            <Typography variant="h5" fontWeight={700}>
              <Skeleton variant="text" width={180} height={34} />
            </Typography>
          ) : (
            <Skeleton variant="text" width={120} height={34} />
          )}
          {viewAll && <Skeleton variant="rounded" width={100} height={32} />}
        </Stack>
      )}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          pb: 2,
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {Array.from({ length: itemCount }).map((_, index) => (
          <Box
            key={`skeleton-${index}`}
            sx={{
              flex: '0 0 auto',
              scrollSnapAlign: 'start',
              width: { xs: '80%', sm: 320 },
              minWidth: { xs: '80%', sm: 320 },
            }}
          >
            <EventBoxSmSkeleton />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
