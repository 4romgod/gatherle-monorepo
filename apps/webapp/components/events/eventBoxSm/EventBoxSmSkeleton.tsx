'use client';

import { Avatar, Box, Skeleton, Stack } from '@mui/material';

export default function EventBoxSmSkeleton() {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: { xs: 1, sm: 2 },
        overflow: 'hidden',
        minHeight: 240,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          paddingTop: '56.25%',
          width: '100%',
          overflow: 'hidden',
          bgcolor: 'action.hover',
        }}
      >
        <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0 }} />
        <Skeleton
          variant="rounded"
          width={88}
          height={22}
          sx={{ position: 'absolute', top: 12, left: 12, borderRadius: 2 }}
        />
      </Box>

      <Box sx={{ flexGrow: 1, p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Skeleton variant="text" width="78%" height={22} />
        <Skeleton variant="text" width="56%" height={22} sx={{ mt: -0.75 }} />

        <Stack spacing={0.5} sx={{ mt: 0.25 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Skeleton variant="circular" width={14} height={14} />
            <Skeleton variant="text" width="68%" height={16} />
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Skeleton variant="circular" width={14} height={14} />
            <Skeleton variant="text" width="48%" height={16} />
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Skeleton variant="circular" width={14} height={14} />
            <Skeleton variant="text" width="34%" height={16} />
          </Stack>
        </Stack>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
          <Stack direction="row" spacing={-0.5} alignItems="center">
            <Avatar sx={{ width: 26, height: 26, bgcolor: 'transparent' }}>
              <Skeleton variant="circular" width={22} height={22} />
            </Avatar>
            <Avatar sx={{ width: 26, height: 26, bgcolor: 'transparent' }}>
              <Skeleton variant="circular" width={22} height={22} />
            </Avatar>
            <Avatar sx={{ width: 26, height: 26, bgcolor: 'transparent' }}>
              <Skeleton variant="circular" width={22} height={22} />
            </Avatar>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
