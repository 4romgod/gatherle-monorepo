'use client';

import { Box, Skeleton, Stack } from '@mui/material';
import { WEB_RADIUS } from '@/lib/constants/radius';

export default function UserProfilePageSkeleton() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 935, mx: 'auto', width: '100%', overflowX: 'hidden' }}>
        <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 4 }, pb: 2 }}>
          <Box sx={{ maxWidth: 560, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2.5, md: 3 }, mb: 1.75 }}>
              <Skeleton variant="circular" width={88} height={88} sx={{ flexShrink: 0 }} />

              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Skeleton variant="text" width={150} height={28} />
                  <Skeleton variant="rounded" width={26} height={26} />
                </Stack>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                  {[0, 1, 2].map((stat) => (
                    <Box key={stat} sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="42%" height={28} sx={{ mx: 'auto' }} />
                      <Skeleton variant="text" width="72%" height={18} sx={{ mx: 'auto', mt: -0.5 }} />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            <Stack spacing={0.75}>
              <Skeleton variant="text" width="44%" height={34} />
              <Skeleton variant="text" width="92%" height={20} />
              <Skeleton variant="text" width="74%" height={20} sx={{ mt: -0.75 }} />
            </Stack>

            <Stack direction="row" spacing={1.25} sx={{ mt: 1.75 }}>
              <Skeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: WEB_RADIUS.card }} />
              <Skeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: WEB_RADIUS.card }} />
            </Stack>
          </Box>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', px: { xs: 2, md: 3 } }}>
            {[0, 1, 2, 3].map((tab) => (
              <Box key={tab} sx={{ flex: 1, py: 1.5, display: 'flex', justifyContent: 'center' }}>
                <Skeleton variant="circular" width={22} height={22} />
              </Box>
            ))}
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))',
                  xl: 'repeat(5, minmax(0, 1fr))',
                },
                gap: { xs: 0.75, md: 1 },
              }}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rounded"
                  sx={{ aspectRatio: '16 / 9', borderRadius: WEB_RADIUS.control }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
