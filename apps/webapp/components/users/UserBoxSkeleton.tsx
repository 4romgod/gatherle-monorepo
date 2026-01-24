'use client';

import { Grid, Box, Skeleton, Stack } from '@mui/material';
import Surface from '@/components/core/Surface';

export default function UserBoxSkeleton() {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
      <Surface
        component="div"
        sx={{
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ height: 48, bgcolor: 'action.hover' }} />
        <Box sx={{ px: 2.5, pb: 2.5, mt: -4 }}>
          <Skeleton variant="circular" width={64} height={64} sx={{ mx: 'auto' }} />
          <Skeleton variant="text" width="60%" height={28} sx={{ mx: 'auto', mt: 2 }} />
          <Skeleton variant="text" width="40%" height={18} sx={{ mx: 'auto', mb: 2 }} />
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Skeleton variant="text" width="80%" height={18} />
            <Skeleton variant="text" width="70%" height={16} />
            <Skeleton variant="text" width="90%" height={16} />
          </Stack>
        </Box>
      </Surface>
    </Grid>
  );
}
