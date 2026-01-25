'use client';

import { CardContent, Skeleton, Stack, Typography, Box } from '@mui/material';
import Card from '@mui/material/Card';
import Surface from '@/components/core/Surface';

export default function OrganizationBoxSkeleton() {
  return (
    <Surface
      component={Card}
      sx={{
        borderRadius: 3,
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
      }}
    >
      <Box
        sx={{
          height: 140,
          borderRadius: '18px 18px 0 0',
          backgroundColor: 'action.selected',
        }}
      >
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="overline">
          <Skeleton variant="text" width={140} height={18} />
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          <Skeleton variant="text" width={160} height={30} />
        </Typography>
        <Skeleton variant="text" width="80%" height={18} />
        <Skeleton variant="text" width="60%" height={18} />
        <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
          {[0, 1, 2].map((pill) => (
            <Skeleton key={pill} variant="rounded" width={80} height={24} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      </CardContent>
      <Skeleton variant="text" width={120} height={24} sx={{ mx: 3, mb: 2 }} />
    </Surface>
  );
}
