'use client';

import CardContent from '@mui/material/CardContent';
import { Card, Stack, Box, Skeleton } from '@mui/material';
import Surface from '@/components/core/Surface';

export default function EventBoxSkeleton() {
  return (
    <Surface
      component={Card}
      sx={{
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
        gridTemplateRows: { xs: 'auto auto', sm: '180px' },
        gap: 0,
        height: { xs: 'auto', sm: 180 },
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
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
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Skeleton variant="rectangular" width={80} height={18} />
        </Stack>
        <Skeleton variant="text" width="80%" height={24} />
        <Skeleton variant="text" width="60%" height={16} />
        <Stack spacing={0.5}>
          <Skeleton variant="text" width="50%" height={14} />
          <Skeleton variant="text" width="60%" height={14} />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </Stack>
      </CardContent>
    </Surface>
  );
}
