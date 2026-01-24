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
            <Box sx={{ height: 200, position: 'relative', bgcolor: 'primary.main' }}>
              <Skeleton variant="rectangular" animation="wave" width="100%" height="100%" />
            </Box>
            <Box sx={{ px: { xs: 3, sm: 4 }, pb: 4 }}>
              <Stack spacing={2}>
                <Skeleton variant="circular" width={140} height={140} sx={{ mt: -8, mx: 'auto' }} />
                <Skeleton variant="text" width="40%" height={32} sx={{ mx: 'auto' }} />
                <Skeleton variant="text" width="60%" height={20} sx={{ mx: 'auto' }} />
              </Stack>
            </Box>
          </Paper>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2}>
                {[1, 2].map((section) => (
                  <Paper
                    key={section}
                    elevation={0}
                    sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                  >
                    <Stack spacing={1}>
                      <Skeleton variant="text" width="60%" height={20} />
                      <Skeleton variant="rectangular" width="100%" height={18} />
                      <Skeleton variant="rectangular" width="80%" height={18} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                {[1, 2].map((section) => (
                  <Paper
                    key={section}
                    elevation={0}
                    sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                  >
                    <Stack spacing={1}>
                      <Skeleton variant="text" width="30%" height={20} />
                      <Skeleton variant="text" width="50%" height={28} />
                      <Skeleton variant="text" width="80%" height={18} />
                      <Skeleton variant="rectangular" width="100%" height={120} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
