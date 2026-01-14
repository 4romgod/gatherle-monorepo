'use client';

import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  List,
  Paper,
  Typography,
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { FollowTargetType } from '@/data/graphql/types/graphql';
import { useFollowRequests } from '@/hooks';
import PendingFollowRequestItem from './PendingFollowRequestItem';

export default function PendingFollowRequestsList() {
  const { requests, loading, error, accept, reject, isLoading } = useFollowRequests(FollowTargetType.User);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load follow requests. Please try again later.
      </Alert>
    );
  }

  // Show empty state
  if (requests.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 4, md: 6 },
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            p: 3,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            mb: 2,
          }}
        >
          <PersonAddIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
        </Box>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          No follow requests
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Follow requests will appear here when someone wants to follow you.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
        <Typography variant="overline" color="primary" fontWeight={700} letterSpacing="0.1em">
          Follow Requests
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        </Typography>
      </Box>
      <Divider />
      <List disablePadding>
        {requests.map((request, index) => (
          <React.Fragment key={request.followId}>
            <PendingFollowRequestItem
              followId={request.followId}
              follower={request.follower}
              approvalStatus={request.approvalStatus}
              createdAt={request.createdAt}
              updatedAt={request.updatedAt}
              onAccept={accept}
              onReject={reject}
              isLoading={isLoading}
            />
            {index < requests.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
}
