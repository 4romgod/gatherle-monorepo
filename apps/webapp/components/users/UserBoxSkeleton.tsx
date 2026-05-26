'use client';

import { Box, Card, Grid, Skeleton, Stack } from '@mui/material';

export default function UserBoxSkeleton() {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
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
        <Box sx={{ p: 1.75 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={58} height={58} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="62%" height={24} />
              <Skeleton variant="text" width="34%" height={18} />
              <Skeleton variant="text" width="82%" height={18} />
              <Skeleton variant="text" width="66%" height={18} sx={{ mt: -0.5 }} />
            </Box>
            <Skeleton variant="rounded" width={84} height={32} sx={{ borderRadius: 999 }} />
          </Stack>
        </Box>
      </Card>
    </Grid>
  );
}
