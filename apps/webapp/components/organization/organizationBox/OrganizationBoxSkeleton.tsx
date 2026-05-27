'use client';

import { Box, Skeleton, Stack } from '@mui/material';

export default function OrganizationBoxSkeleton() {
  return (
    <Box
      sx={{
        borderRadius: 3,
        display: 'flex',
        height: '100%',
        p: 1.75,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
        <Skeleton variant="rounded" width={58} height={58} sx={{ borderRadius: 2, flexShrink: 0 }} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="56%" height={24} />
          <Skeleton variant="text" width="88%" height={18} />
          <Skeleton variant="text" width="72%" height={18} sx={{ mt: -0.5 }} />
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
            <Skeleton variant="text" width={72} height={16} />
            <Skeleton variant="text" width={60} height={16} />
            <Skeleton variant="text" width={44} height={16} />
          </Stack>
        </Box>

        <Stack spacing={1} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Skeleton variant="rounded" width={62} height={26} sx={{ borderRadius: 999 }} />
          <Skeleton variant="rounded" width={86} height={32} sx={{ borderRadius: 2 }} />
        </Stack>
      </Stack>
    </Box>
  );
}
