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
import { Close as CloseIcon, PersonOutline as PersonOutlineIcon } from '@mui/icons-material';
import { useFollowing, useFollow, useMutedUsers, useMutedOrganizations } from '@/hooks';
import { FollowTargetType, FollowApprovalStatus } from '@/data/graphql/types/graphql';
import FollowingListItem from './following-list-item';
import FollowListSkeleton from './follow-list-skeleton';

interface FollowingListProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export default function FollowingList({
  open,
  onClose,
  title,
}: FollowingListProps) {
  const { following, loading, error } = useFollowing();
  const { unfollow, unfollowLoading } = useFollow();
  const { mutedUsers } = useMutedUsers();
  const { mutedOrgIds } = useMutedOrganizations();

  // Extract muted user IDs from the muted users list
  const mutedUserIds = mutedUsers.map(u => u.userId);

  const dialogTitle = title || 'Following';

  const acceptedFollowing = following
    .filter(item => item.approvalStatus === FollowApprovalStatus.Accepted)
    .map((item) => ({
      followId: item.followId,
      targetType: item.targetType,
      targetId: item.targetId,
      targetUser: item.targetUser ? {
        userId: item.targetUser.userId,
        username: item.targetUser.username,
        email: item.targetUser.email,
        given_name: item.targetUser.given_name,
        family_name: item.targetUser.family_name,
        profile_picture: item.targetUser.profile_picture || undefined,
        bio: item.targetUser.bio || undefined,
      } : undefined,
      targetOrganization: item.targetOrganization ? {
        orgId: item.targetOrganization.orgId,
        slug: item.targetOrganization.slug,
        name: item.targetOrganization.name,
        logo: item.targetOrganization.logo || undefined,
      } : undefined,
    }));

  const handleUnfollow = async (targetId: string, targetType: FollowTargetType) => {
    await unfollow(targetType, targetId);
  };

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
              Failed to load following list
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              {error.message || 'Please try again later'}
            </Typography>
          </Box>
        ) : acceptedFollowing.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <PersonOutlineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" variant="body1">
              Not following anyone yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {acceptedFollowing.map(item => (
              <FollowingListItem
                key={item.followId}
                following={item}
                onUnfollow={handleUnfollow}
                isLoading={unfollowLoading}
                mutedUserIds={mutedUserIds}
                mutedOrgIds={mutedOrgIds}
              />
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
