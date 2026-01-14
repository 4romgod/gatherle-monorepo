'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import PendingFollowRequestsList from './follow/PendingFollowRequestsList';

export default function NotificationsPage() {
  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight={700} mb={4}>
          Notifications
        </Typography>

        <PendingFollowRequestsList />
      </Container>
    </Box>
  );
}
