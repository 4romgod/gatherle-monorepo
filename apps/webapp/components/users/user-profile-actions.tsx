'use client';

import { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Stack } from '@mui/material';
import { MoreVert, Block, RemoveCircleOutline } from '@mui/icons-material';
import { useBlock, useBlockedUsers, useAppContext } from '@/hooks';
import { useRouter } from 'next/navigation';
import FollowButton from './follow-button';

interface UserProfileActionsProps {
  userId: string;
  username: string;
}

export default function UserProfileActions({ userId, username }: UserProfileActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { blockUser, unblockUser, isLoading } = useBlock();
  const { blockedUsers } = useBlockedUsers();
  const { setToastProps } = useAppContext();
  const router = useRouter();

  const isBlocked = blockedUsers?.some((u: { userId: string }) => u.userId === userId);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleBlock = async () => {
    try {
      handleMenuClose();
      await blockUser(userId);
      setToastProps({
        open: true,
        message: `Blocked @${username}. They can no longer follow you or see your activity.`,
        severity: 'success',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
      router.refresh();
    } catch (error) {
      setToastProps({
        open: true,
        message: 'Failed to block user',
        severity: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
    }
  };

  const handleUnblock = async () => {
    try {
      handleMenuClose();
      await unblockUser(userId);
      setToastProps({
        open: true,
        message: `Unblocked @${username}`,
        severity: 'success',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
      router.refresh();
    } catch (error) {
      setToastProps({
        open: true,
        message: 'Failed to unblock user',
        severity: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
    }
  };

  return (
    <Stack direction="row" spacing={1}>
      <FollowButton targetId={userId} size="small" />
      <IconButton
        onClick={handleMenuOpen}
        size="small"
        sx={{
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 2,
          '&:hover': {
            bgcolor: 'background.default',
            boxShadow: 4,
          },
        }}
      >
        <MoreVert />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {isBlocked ? (
          <MenuItem onClick={handleUnblock} disabled={isLoading}>
            <ListItemIcon>
              <RemoveCircleOutline fontSize="small" />
            </ListItemIcon>
            <ListItemText>Unblock User</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleBlock} disabled={isLoading}>
            <ListItemIcon>
              <Block fontSize="small" />
            </ListItemIcon>
            <ListItemText>Block User</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Stack>
  );
}
