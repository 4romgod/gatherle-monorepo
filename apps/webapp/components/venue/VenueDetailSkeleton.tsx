'use client';

import { Box, Card, CardContent, Container, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material';

export default function VenueDetailSkeleton() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          position: 'relative',
          height: { xs: 280, sm: 320, md: 360 },
          bgcolor: 'grey.900',
          overflow: 'hidden',
        }}
      >
        <Skeleton animation="wave" variant="rectangular" sx={{ width: '100%', height: '100%' }} />
        <Container
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 2,
            pb: { xs: 4, md: 6 },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Skeleton variant="rounded" width={142} height={38} />
            <Skeleton variant="rounded" width={132} height={38} />
            <Skeleton variant="rounded" width={108} height={38} />
          </Stack>
          <Stack spacing={1}>
            <Skeleton animation="wave" variant="text" width="50%" height={38} />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Skeleton variant="rounded" animation="wave" width={88} height={24} />
              <Skeleton variant="rounded" animation="wave" width={132} height={24} />
            </Stack>
            <Skeleton animation="wave" variant="text" width="58%" height={22} />
          </Stack>
        </Container>
      </Box>

      <Container sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={4}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Venue overview
                </Typography>
                <Stack spacing={1}>
                  <Skeleton variant="text" width="66%" />
                  <Skeleton variant="text" width="72%" />
                </Stack>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    Location map
                  </Typography>
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    sx={{ width: '100%', height: 220, borderRadius: 2 }}
                  />
                </Box>
              </Box>

              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    Amenities
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} variant="rounded" width={90} height={32} animation="wave" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <Skeleton variant="rounded" animation="wave" sx={{ width: '100%', height: 54, borderRadius: 2 }} />
              <Skeleton variant="rounded" animation="wave" sx={{ width: '100%', height: 188, borderRadius: 3 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Upcoming Events
                </Typography>
                <Stack direction="row" spacing={2}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      variant="rounded"
                      animation="wave"
                      sx={{ width: 220, height: 220, borderRadius: 2 }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
      <Divider />
    </Box>
  );
}
