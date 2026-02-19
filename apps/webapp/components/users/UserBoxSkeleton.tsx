'use client';

import { Grid, Box, Skeleton, Stack, Card } from '@mui/material';

export default function UserBoxSkeleton() {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={56} height={56} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={24} />
              <Skeleton variant="text" width="40%" height={16} />
              <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.25 }} />
            </Box>
          </Stack>
          <Skeleton variant="text" width="90%" height={16} sx={{ mt: 2 }} />
          <Skeleton variant="text" width="75%" height={16} />
          <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
            <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: 3 }} />
          </Stack>
          <Skeleton variant="rounded" width="100%" height={32} sx={{ mt: 3, borderRadius: 2 }} />
        </Box>
      </Card>
    </Grid>
  );
}
