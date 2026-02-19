'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Stack } from '@mui/material';
import { MoreVert, Block, RemoveCircleOutline, MailOutline } from '@mui/icons-material';
import { useBlock, useBlockedUsers, useAppContext } from '@/hooks';
import { useRouter } from 'next/navigation';
import FollowButton from './FollowButton';

interface UserProfileActionsProps {
  userId: string;
  username: string;
  canMessage?: boolean;
  messageHref?: string;
}

export default function UserProfileActions({
  userId,
  username,
  canMessage = false,
  messageHref,
}: UserProfileActionsProps) {
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
      {canMessage && messageHref && (
        <Button
          component={Link}
          href={messageHref}
          variant="outlined"
          size="small"
          startIcon={<MailOutline />}
          sx={{
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'background.default',
              borderColor: 'text.secondary',
            },
          }}
        >
          Message
        </Button>
      )}
      <FollowButton targetId={userId} size="small" />
      <IconButton
        onClick={handleMenuOpen}
        size="small"
        sx={{
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            bgcolor: 'background.default',
            borderColor: 'text.secondary',
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
