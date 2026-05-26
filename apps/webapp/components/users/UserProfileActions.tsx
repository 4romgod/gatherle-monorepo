'use client';

import { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Stack } from '@mui/material';
import { MoreVert, Block, RemoveCircleOutline } from '@mui/icons-material';
import { useBlock, useBlockedUsers, useAppContext } from '@/hooks';
import { useRouter } from 'next/navigation';
import FollowButton from './FollowButton';
import { ProfileActionButton } from './ProfileActionButton';
import { FiMessageCircle } from 'react-icons/fi';

interface UserProfileActionsProps {
  userId: string;
  username: string;
  canMessage?: boolean;
  messageHref?: string;
  /** When true, Follow and Message buttons stretch to fill available width */
  fullWidth?: boolean;
  showOverflow?: boolean;
}

export default function UserProfileActions({
  userId,
  username,
  canMessage = false,
  messageHref,
  fullWidth = false,
  showOverflow = true,
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
    <Stack
      direction="row"
      sx={{
        gap: 1,
        ...(fullWidth && { width: '100%' }),
      }}
    >
      {canMessage && messageHref && <ProfileActionButton href={messageHref} icon={FiMessageCircle} label="Message" />}
      <Box sx={{ flex: fullWidth ? 1 : undefined, minWidth: 0 }}>
        <FollowButton targetId={userId} size={fullWidth ? 'medium' : 'small'} fullWidth={fullWidth} variant="profile" />
      </Box>
      {showOverflow ? (
        <IconButton
          onClick={handleMenuOpen}
          size="small"
          sx={{
            borderRadius: 2,
            flexShrink: 0,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: (theme) => (theme.palette.mode === 'light' ? 'rgba(0,0,0,0.3)' : 'divider'),
            '&:hover': {
              bgcolor: 'background.default',
              borderColor: 'text.secondary',
            },
          }}
        >
          <MoreVert />
        </IconButton>
      ) : null}

      {showOverflow ? (
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
      ) : null}
    </Stack>
  );
}
