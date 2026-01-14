'use client';

import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, People as PeopleIcon } from '@mui/icons-material';
import { useFollowers } from '@/hooks';
import { FollowTargetType } from '@/data/graphql/types/graphql';
import FollowersListItem from './followers-list-item';
import FollowListSkeleton from './follow-list-skeleton';

interface FollowersListProps {
  targetId: string;
  targetType: FollowTargetType;
  open: boolean;
  onClose: () => void;
  title?: string;
}

export default function FollowersList({
  targetId,
  targetType,
  open,
  onClose,
  title,
}: FollowersListProps) {
  const { followers, loading, error } = useFollowers(targetType, targetId);

  const dialogTitle = title || 'Followers';

  // Convert null to undefined for type safety
  const mappedFollowers = followers.map((item) => ({
    followId: item.followId,
    follower: {
      userId: item.follower.userId,
      username: item.follower.username,
      email: item.follower.email,
      given_name: item.follower.given_name,
      family_name: item.follower.family_name,
      profile_picture: item.follower.profile_picture || undefined,
      bio: item.follower.bio || undefined,
    },
  }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            maxHeight: '80vh',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          fontWeight: 700,
        }}
      >
        {dialogTitle}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <List sx={{ py: 0 }}>
            <FollowListSkeleton count={5} />
          </List>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <Typography color="error" variant="body1">
              Failed to load followers
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              {error.message || 'Please try again later'}
            </Typography>
          </Box>
        ) : mappedFollowers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" variant="body1">
              No followers yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {mappedFollowers.map(follower => (
              <FollowersListItem
                key={follower.followId}
                follower={follower.follower}
                targetType={FollowTargetType.User}
              />
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
