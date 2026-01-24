'use client';

import CardContent from '@mui/material/CardContent';
import { Card, Stack, Box, Skeleton } from '@mui/material';
import Surface from '@/components/core/Surface';

export default function EventBoxSmSkeleton() {
  return (
    <Surface
      component={Card}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        minHeight: 240,
        boxShadow: 'none',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: { xs: 140, sm: 180 },
          width: '100%',
          overflow: 'hidden',
          bgcolor: 'action.selected',
        }}
      >
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="70%" height={24} />
        <Skeleton variant="text" width="50%" height={18} />
        <Skeleton variant="text" width="65%" height={18} />
        <Skeleton variant="text" width="40%" height={18} />
        <Stack direction="row" spacing={0.5} sx={{ mt: 'auto' }}>
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
        </Stack>
      </CardContent>
    </Surface>
  );
}
