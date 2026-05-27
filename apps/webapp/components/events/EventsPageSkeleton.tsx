'use client';

import { Box, Grid, Skeleton, Stack } from '@mui/material';
import { WEB_RADIUS } from '@/lib/constants/radius';
import EventTileSkeletonGrid from './EventTileSkeleton';

/**
 * Full-page skeleton for the events page that mirrors the actual layout:
 * heading, search bar, filter buttons, and event cards.
 */
export default function EventsPageSkeleton() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', py: 4 }}>
      <Grid container spacing={3}>
        {/* Main content column */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Header section */}
          <Box mb={4}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
              <Box>
                {/* "Discover Events" heading */}
                <Skeleton variant="text" width={280} height={52} sx={{ mb: 1 }} />
              </Box>
            </Stack>

            {/* Search bar skeleton */}
            <Skeleton variant="rounded" width="100%" height={56} sx={{ borderRadius: WEB_RADIUS.panel }} />
          </Box>

          {/* Filter buttons row */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
              pb: 1,
              mb: 2,
            }}
          >
            {['Categories', 'Status', 'Date', 'Location'].map((label) => (
              <Skeleton
                key={label}
                variant="rounded"
                width={label === 'Categories' ? 130 : label === 'Location' ? 115 : 95}
                height={40}
                sx={{ borderRadius: WEB_RADIUS.pill, flexShrink: 0 }}
              />
            ))}
          </Box>

          {/* "X Events Found" heading skeleton */}
          <Box mb={3} mt={5}>
            <Skeleton variant="text" width={180} height={32} />
          </Box>

          {/* Event card skeletons */}
          <EventTileSkeletonGrid count={4} />
        </Grid>

        {/* Sidebar column (desktop only) */}
        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <Box
            sx={{
              position: 'sticky',
              top: 80,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {/* Sidebar card skeletons */}
            <Skeleton variant="rounded" width="100%" height={200} sx={{ borderRadius: WEB_RADIUS.card }} />
            <Skeleton variant="rounded" width="100%" height={160} sx={{ borderRadius: WEB_RADIUS.card }} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
