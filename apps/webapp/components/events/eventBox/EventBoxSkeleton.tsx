'use client';

import { Avatar, Box, Chip, Skeleton, Stack } from '@mui/material';
import Surface from '@/components/core/Surface';

export default function EventBoxSkeleton() {
  return (
    <Surface
      sx={{
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '240px minmax(0, 1fr)' },
        gridTemplateRows: { xs: 'auto auto', sm: 'auto' },
        gap: 0,
        height: 'auto',
        borderRadius: { xs: 1, sm: 2 },
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'background.default',
      }}
    >
      <Box
        sx={{
          alignSelf: 'start',
          position: 'relative',
          aspectRatio: '16 / 9',
          width: '100%',
          overflow: 'hidden',
          bgcolor: 'action.hover',
        }}
      >
        <Skeleton variant="rectangular" width="100%" height="100%" />
        <Chip
          label={<Skeleton variant="text" width={56} height={12} />}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1,
            height: 24,
            borderRadius: 999,
            bgcolor: 'background.paper',
            '& .MuiChip-label': { px: 1 },
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: 1.5,
          gap: 1,
          overflow: 'hidden',
          height: { xs: 'auto', sm: '100%' },
        }}
      >
        <Box sx={{ flex: '1 1 auto', overflow: 'hidden' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
            <Skeleton variant="rounded" width={92} height={18} />
          </Stack>
          <Skeleton variant="text" width="78%" height={24} />
          <Skeleton variant="text" width="58%" height={24} sx={{ mt: -0.75 }} />

          <Stack spacing={0.75} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Skeleton variant="circular" width={14} height={14} />
              <Skeleton variant="text" width="62%" height={16} />
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Skeleton variant="circular" width={14} height={14} />
              <Skeleton variant="text" width="48%" height={16} />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <Stack direction="row" spacing={-0.5}>
            <Avatar sx={{ width: 24, height: 24 }}>
              <Skeleton variant="circular" width={20} height={20} />
            </Avatar>
            <Avatar sx={{ width: 24, height: 24 }}>
              <Skeleton variant="circular" width={20} height={20} />
            </Avatar>
            <Avatar sx={{ width: 24, height: 24 }}>
              <Skeleton variant="circular" width={20} height={20} />
            </Avatar>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
          </Stack>
        </Box>
      </Box>
    </Surface>
  );
}
