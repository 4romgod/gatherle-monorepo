'use client';

import { Box, Container, Skeleton, Stack, Card, CardContent } from '@mui/material';

export default function EventDetailSkeleton() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Box>
            <Skeleton variant="rectangular" height={200} />
          </Box>
          <Stack spacing={3}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Skeleton variant="text" width="70%" height={28} />
                    <Skeleton variant="text" width="50%" height={18} />
                    <Skeleton variant="text" width="90%" height={18} />
                    <Skeleton variant="rectangular" height={120} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
