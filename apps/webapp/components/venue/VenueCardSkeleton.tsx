'use client';

import { Box, Skeleton, Stack } from '@mui/material';
import Surface from '@/components/core/Surface';

export default function VenueCardSkeleton() {
  return (
    <Surface
      sx={{
        borderRadius: 2,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, width: '100%' }}>
        <Skeleton variant="rounded" width={72} height={72} sx={{ borderRadius: 1.25, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="58%" height={24} />
          <Skeleton variant="text" width="30%" height={18} />
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width="72%" height={18} />
          </Stack>
        </Box>
        <Stack spacing={1} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Skeleton variant="rounded" width={88} height={24} />
          <Skeleton variant="circular" width={18} height={18} />
        </Stack>
      </Box>
    </Surface>
  );
}
