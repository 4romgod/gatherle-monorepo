'use client';

import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import { 
  Close as CloseIcon, 
  NotificationsOff as NotificationsOffIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useMutedUsers, useMuteUser } from '@/hooks';
import FollowListSkeleton from './follow-list-skeleton';
import Link from 'next/link';

interface MutedFollowersListProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export default function MutedFollowersList({
  open,
  onClose,
  title,
}: MutedFollowersListProps) {
  const { mutedUsers, loading, error } = useMutedUsers();
  const { unmuteUser, loading: unmuteLoading } = useMuteUser();

  const dialogTitle = title || 'Muted Users';

  const handleUnmute = async (userId: string) => {
    await unmuteUser(userId);
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
              Failed to load muted users
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              {error.message || 'Please try again later'}
            </Typography>
          </Box>
        ) : mutedUsers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <NotificationsOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" variant="body1">
              No muted users
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              Mute users to hide their content from your feed
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {mutedUsers.map(user => {
              const fullName = `${user.given_name} ${user.family_name}`.trim();
              return (
                <ListItem
                  key={user.userId}
                  sx={{
                    px: 2,
                    py: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemAvatar sx={{ mt: 0.5 }}>
                    <Link href={`/users/${user.username}`}>
                      <Avatar
                        src={user.profile_picture || undefined}
                        alt={fullName}
                        sx={{ width: 48, height: 48, cursor: 'pointer' }}
                      >
                        {fullName.charAt(0).toUpperCase()}
                      </Avatar>
                    </Link>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Link
                            href={`/users/${user.username}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              sx={{
                                cursor: 'pointer',
                                '&:hover': { color: 'primary.main' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {fullName}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              @{user.username}
                            </Typography>
                          </Link>
                        </Box>

                        <Box sx={{ flexShrink: 0 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<NotificationsIcon />}
                            onClick={() => handleUnmute(user.userId)}
                            disabled={unmuteLoading}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: 2,
                            }}
                          >
                            Unmute
                          </Button>
                        </Box>
                      </Box>
                    }
                    secondary={
                      user.bio ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {user.bio}
                        </Typography>
                      ) : null
                    }
                    slotProps={{
                      secondary: { component: 'div' },
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
