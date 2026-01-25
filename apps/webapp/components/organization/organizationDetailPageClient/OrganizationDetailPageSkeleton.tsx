'use client';

import { Avatar, Box, Card, CardContent, Container, Grid, Skeleton, Stack, Typography } from '@mui/material';

export default function OrganizationPageSkeleton() {
  return (
    <Box>
      <Box sx={{ position: 'relative' }}>
        <Skeleton variant="rectangular" animation="wave" sx={{ height: { xs: 280, sm: 340, md: 380 } }} />
        <Container
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            pb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
            <Skeleton variant="circular" width={120} height={120} />
            <Skeleton variant="rectangular" width={200} height={32} />
          </Box>
        </Container>
      </Box>

      <Container sx={{ mt: -6, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {[1, 2].map((key) => (
                <Card key={key} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Skeleton width="40%" height={28} />
                    <Skeleton width="60%" height={20} />
                    <Skeleton width="100%" height={14} />
                    <Skeleton width="90%" height={14} />
                    <Skeleton variant="rectangular" height={150} sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              {[1, 2].map((key) => (
                <Card key={key} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Skeleton width="50%" height={20} />
                    <Skeleton width="80%" height={14} />
                    <Skeleton width="60%" height={14} />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
