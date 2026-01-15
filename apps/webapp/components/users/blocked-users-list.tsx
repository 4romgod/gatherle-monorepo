'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Skeleton,
  Typography,
  Box,
  Button,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CloseIcon from '@mui/icons-material/Close';
import { useBlockedUsers, useBlock, useAppContext } from '@/hooks';
import Link from 'next/link';
interface BlockedUsersListProps {
  open: boolean;
  onClose: () => void;
}

export function BlockedUsersList({ open, onClose }: BlockedUsersListProps) {
  const { blockedUsers, loading } = useBlockedUsers();
  const { unblockUser, isLoading: unblockLoading } = useBlock();
  const { setToastProps } = useAppContext();
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  const handleUnblock = async (userId: string, username: string) => {
    try {
      setUnblockingUserId(userId);
      await unblockUser(userId);
      setToastProps({
        open: true,
        message: `Unblocked @${username}`,
        severity: 'success',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
    } catch (error) {
      setToastProps({
        open: true,
        message: 'Failed to unblock user',
        severity: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
    } finally {
      setUnblockingUserId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Blocked Users</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <List>
            {[1, 2, 3].map((i) => (
              <ListItem key={i}>
                <ListItemAvatar>
                  <Skeleton variant="circular" width={40} height={40} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Skeleton width="60%" />}
                  secondary={<Skeleton width="40%" />}
                />
              </ListItem>
            ))}
          </List>
        ) : blockedUsers.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={4}
          >
            <BlockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No blocked users
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
              When you block someone, they won&apos;t be able to follow you or see your activity.
            </Typography>
          </Box>
        ) : (
          <List>
            {blockedUsers.map((user) => (
              <ListItem
                key={user.userId}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleUnblock(user.userId, user.username)}
                    disabled={unblockingUserId === user.userId || unblockLoading}
                  >
                    Unblock
                  </Button>
                }
              >
                <ListItemAvatar>
                  <Link href={`/users/${user.userId}`}>
                    <Avatar src={user.profile_picture || undefined} alt={user.username}>
                      {user.username[0]?.toUpperCase()}
                    </Avatar>
                  </Link>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Link href={`/users/${user.userId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {user.username}
                    </Link>
                  }
                  secondary={`${user.given_name} ${user.family_name}`.trim()}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
