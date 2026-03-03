'use client';

import { Box, Container, Grid, Paper, Skeleton, Stack } from '@mui/material';

export default function UserProfilePageSkeleton() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
          >
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, md: 3 } }}>
                <Skeleton variant="circular" width={100} height={100} sx={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="50%" height={36} />
                  <Skeleton variant="text" width="30%" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="70%" height={18} />
                </Box>
              </Box>
            </Box>
          </Paper>

          <Grid container spacing={3}>
            {/* Tabs — full width */}
            <Grid size={{ xs: 12 }}>
              <Paper
                elevation={0}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
              >
                {/* Tab bar skeleton — 4 tabs */}
                <Stack direction="row" spacing={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                  {[1, 2, 3, 4].map((tab) => (
                    <Box key={tab} sx={{ flex: 1, py: 2, display: 'flex', justifyContent: 'center' }}>
                      <Skeleton variant="text" width="60%" height={24} />
                    </Box>
                  ))}
                </Stack>
                {/* Event cards skeleton */}
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {[1, 2, 3].map((card) => (
                      <Grid key={card} size={{ xs: 12, sm: 4 }}>
                        <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 2 }} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Info sections below the tabs */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={1}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="rectangular" width="100%" height={18} />
                  <Skeleton variant="rectangular" width="80%" height={18} />
                  <Skeleton variant="rectangular" width="90%" height={18} />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={1}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 1 }}>
                    {[1, 2, 3, 4, 5].map((chip) => (
                      <Skeleton key={chip} variant="rounded" width={80} height={32} />
                    ))}
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
