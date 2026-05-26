'use client';

import { Box, Button, Chip, Container, Grid, Paper, Skeleton, Stack } from '@mui/material';

export default function EventDetailSkeleton() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 18, md: 22 } }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 2, md: 3 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
        <Stack spacing={{ xs: 2, md: 2.5 }}>
          <Box sx={{ aspectRatio: '16 / 9', borderRadius: 1.5, overflow: 'hidden' }}>
            <Skeleton variant="rectangular" width="100%" height="100%" />
          </Box>

          <Stack spacing={1.5} sx={{ px: { xs: 0.5, md: 0 } }}>
            <Chip
              label={<Skeleton variant="text" width={132} height={18} />}
              variant="outlined"
              sx={{ alignSelf: 'flex-start', height: 32 }}
            />
            <Stack spacing={1}>
              <Skeleton variant="text" width="62%" height={44} />
              <Skeleton variant="text" width="38%" height={44} sx={{ mt: -1.5 }} />
            </Stack>
          </Stack>
        </Stack>
      </Container>

      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 2, md: 3 },
          mb: 8,
          position: 'relative',
          zIndex: 1,
          px: { xs: 1.5, sm: 2, md: 3 },
        }}
      >
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3.5} sx={{ px: { xs: 1, md: 0 } }}>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1.25}>
                  <Button fullWidth variant="outlined" sx={{ justifyContent: 'flex-start', borderRadius: 4, py: 1.75 }}>
                    <Skeleton variant="text" width={92} height={20} />
                  </Button>
                  <Button fullWidth variant="outlined" sx={{ justifyContent: 'flex-start', borderRadius: 4, py: 1.75 }}>
                    <Skeleton variant="text" width={118} height={20} />
                  </Button>
                </Stack>
                <Button fullWidth variant="outlined" sx={{ justifyContent: 'flex-start', borderRadius: 4, py: 1.75 }}>
                  <Skeleton variant="text" width={136} height={20} />
                </Button>
              </Stack>

              <Box>
                <Skeleton variant="text" width={112} height={32} sx={{ mb: 1.5 }} />
                <Skeleton variant="rounded" width="100%" height={96} sx={{ borderRadius: 3 }} />
              </Box>

              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{ flex: '1 1 180px', minHeight: 124, borderRadius: '18px', p: 2 }}
                  >
                    <Skeleton variant="circular" width={22} height={22} />
                    <Skeleton variant="text" width="42%" height={20} sx={{ mt: 1 }} />
                    <Skeleton variant="text" width="84%" height={24} />
                    <Skeleton variant="text" width="68%" height={24} sx={{ mt: -1 }} />
                  </Paper>
                ))}
              </Stack>

              <Box>
                <Skeleton variant="text" width={164} height={32} sx={{ mb: 1.5 }} />
                <Stack spacing={1}>
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="94%" height={20} />
                  <Skeleton variant="text" width="88%" height={20} />
                </Stack>
              </Box>

              <Box>
                <Skeleton variant="text" width={132} height={32} sx={{ mb: 1.5 }} />
                <Paper elevation={0} sx={{ borderRadius: '18px', p: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="42%" height={22} />
                      <Skeleton variant="text" width="24%" height={18} />
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: 'sticky', top: 24, display: { xs: 'none', md: 'block' } }}>
              <Stack spacing={3}>
                <Paper elevation={0} sx={{ borderRadius: 3, p: 3 }}>
                  <Skeleton variant="text" width={96} height={18} sx={{ mb: 1.5 }} />
                  <Skeleton variant="text" width="86%" height={26} />
                  <Skeleton variant="text" width="62%" height={24} />
                </Paper>
                <Paper elevation={0} sx={{ borderRadius: 3, p: 3 }}>
                  <Skeleton variant="text" width={144} height={18} sx={{ mb: 1.5 }} />
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Skeleton variant="rounded" width={128} height={32} />
                    <Skeleton variant="rounded" width={112} height={32} />
                  </Stack>
                </Paper>
                <Paper elevation={0} sx={{ borderRadius: 3, p: 3 }}>
                  <Skeleton variant="text" width={96} height={18} sx={{ mb: 1.5 }} />
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Skeleton variant="rounded" width={88} height={28} />
                    <Skeleton variant="rounded" width={112} height={28} />
                    <Skeleton variant="rounded" width={96} height={28} />
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
