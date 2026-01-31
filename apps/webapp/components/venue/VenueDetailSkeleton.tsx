'use client';

import { Box, Card, CardContent, Container, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material';

export default function VenueDetailSkeleton() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          position: 'relative',
          height: { xs: 260, sm: 300, md: 340 },
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
            pb: { xs: 3, md: 5 },
          }}
        >
          <Stack spacing={1}>
            <Skeleton animation="wave" variant="text" width="50%" height={30} />
            <Skeleton animation="wave" variant="text" width="35%" height={24} />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Skeleton variant="rounded" animation="wave" width={80} height={24} />
            <Skeleton variant="rounded" animation="wave" width={120} height={24} />
            <Skeleton variant="rounded" animation="wave" width={70} height={24} />
          </Stack>
        </Container>
      </Box>

      <Container sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={4}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                      Venue overview
                    </Typography>
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="60%" />
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
                </CardContent>
              </Card>
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
              <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', height: 50, borderRadius: 2 }} />
              <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', height: 150, borderRadius: 2 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Gallery
                </Typography>
                <Stack direction="row" spacing={1}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      variant="rectangular"
                      animation="wave"
                      sx={{ width: 110, height: 90, borderRadius: 2 }}
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
