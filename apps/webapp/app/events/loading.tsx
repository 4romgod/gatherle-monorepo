import { Box, Container, Grid, Skeleton, Stack, Typography } from '@mui/material';

export default function EventsLoading() {
  return (
    <Container>
      <Box component="main" sx={{ minHeight: '100vh', py: 4 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Box mb={4} role="status" aria-label="Loading events">
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Box>
                  <Typography variant="h3" fontWeight={700} sx={{ mb: 1, fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                    Discover Events
                  </Typography>
                </Box>
              </Stack>

              <Skeleton variant="rounded" width="100%" height={56} sx={{ borderRadius: 4 }} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, pb: 1, mb: 2 }}>
              <Skeleton variant="rounded" width={130} height={40} sx={{ borderRadius: '50px', flexShrink: 0 }} />
              <Skeleton variant="rounded" width={95} height={40} sx={{ borderRadius: '50px', flexShrink: 0 }} />
              <Skeleton variant="rounded" width={95} height={40} sx={{ borderRadius: '50px', flexShrink: 0 }} />
              <Skeleton variant="rounded" width={115} height={40} sx={{ borderRadius: '50px', flexShrink: 0 }} />
            </Box>

            <Skeleton variant="text" width={180} height={32} sx={{ mt: 5, mb: 3 }} />

            <Grid container spacing={2}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Grid key={index} size={{ xs: 12, sm: 6 }}>
                  <Skeleton variant="rounded" width="100%" height={280} sx={{ borderRadius: 3 }} />
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }} sx={{ display: { xs: 'none', lg: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="rounded" width="100%" height={200} sx={{ borderRadius: 3 }} />
              <Skeleton variant="rounded" width="100%" height={160} sx={{ borderRadius: 3 }} />
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
