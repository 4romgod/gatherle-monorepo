'use client';

import { Box, Card, CardContent, Container, Grid, Skeleton, Stack } from '@mui/material';

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
            <Skeleton
              variant="circular"
              width={120}
              height={120}
              sx={{ width: { xs: 80, sm: 100, md: 120 }, height: { xs: 80, sm: 100, md: 120 } }}
            />
            <Skeleton variant="text" width={220} height={40} />
          </Box>
        </Container>
      </Box>

      <Container sx={{ mt: -6, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Skeleton width="16%" height={20} />
                  <Skeleton width="42%" height={34} />
                  <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                    <Skeleton width="100%" height={18} />
                    <Skeleton width="92%" height={18} />
                    <Skeleton width="78%" height={18} />
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 3 }}>
                    <Skeleton variant="rounded" width={68} height={24} />
                    <Skeleton variant="rounded" width={82} height={24} />
                    <Skeleton variant="rounded" width={74} height={24} />
                  </Stack>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Skeleton width="28%" height={28} sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    <Skeleton variant="rounded" width="100%" height={42} />
                    <Skeleton variant="rounded" width="100%" height={42} />
                    <Skeleton variant="rounded" width="32%" height={24} />
                  </Stack>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Skeleton width="34%" height={28} sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
                    {[0, 1, 2].map((key) => (
                      <Box key={key} sx={{ width: { xs: 220, sm: 260 }, flexShrink: 0 }}>
                        <Skeleton variant="rounded" width="100%" height={220} sx={{ borderRadius: 2 }} />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Skeleton width="48%" height={20} />
                  <Skeleton width="86%" height={18} sx={{ mt: 1 }} />
                  <Skeleton variant="rounded" width="100%" height={36} sx={{ mt: 2 }} />
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Skeleton width="42%" height={20} />
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {Array.from({ length: 4 }).map((_, key) => (
                      <Box key={key}>
                        <Skeleton width="34%" height={14} />
                        <Skeleton width="54%" height={18} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
