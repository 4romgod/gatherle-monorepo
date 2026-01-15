'use client';

import React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PersonRemove as PersonRemoveIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import { FollowTargetType } from '@/data/graphql/types/graphql';
import { useMuteUser, useMuteOrganization } from '@/hooks';

interface FollowingUser {
  userId: string;
  username: string;
  email: string;
  given_name: string;
  family_name: string;
  profile_picture?: string;
  bio?: string;
}

interface FollowingOrg {
  orgId: string;
  slug: string;
  name: string;
  logo?: string;
}

interface FollowingTarget {
  followId: string;
  targetType: FollowTargetType;
  targetId: string;
  targetUser?: FollowingUser;
  targetOrganization?: FollowingOrg;
}

interface FollowingListItemProps {
  following: FollowingTarget;
  onUnfollow: (targetId: string, targetType: FollowTargetType) => Promise<any>;
  isLoading?: boolean;
  /** IDs of muted users */
  mutedUserIds?: string[];
  /** IDs of muted organizations */
  mutedOrgIds?: string[];
}

export default function FollowingListItem({
  following,
  onUnfollow,
  isLoading = false,
  mutedUserIds = [],
  mutedOrgIds = [],
}: FollowingListItemProps) {
  const [localLoading, setLocalLoading] = React.useState(false);
  const { muteUser, unmuteUser, loading: muteUserLoading } = useMuteUser();
  const { muteOrganization, unmuteOrganization, loading: muteOrgLoading } = useMuteOrganization();

  const isUser = following.targetType === FollowTargetType.User;
  const target = isUser ? following.targetUser : following.targetOrganization;
  
  // Check if muted based on the muted lists
  const isMuted = isUser 
    ? mutedUserIds.includes(following.targetId)
    : mutedOrgIds.includes(following.targetId);

  if (!target) return null;

  let fullName: string;
  let identifier: string;
  let avatarSrc: string | undefined;
  let linkPath: string;

  if (isUser) {
    const userTarget = target as FollowingUser;
    fullName = `${userTarget.given_name} ${userTarget.family_name}`.trim();
    identifier = userTarget.username;
    avatarSrc = userTarget.profile_picture;
    linkPath = `/users/${identifier}`;
  } else {
    const orgTarget = target as FollowingOrg;
    fullName = orgTarget.name;
    identifier = orgTarget.slug;
    avatarSrc = orgTarget.logo;
    linkPath = `/organizations/${identifier}`;
  }

  const handleUnfollow = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setLocalLoading(true);
    try {
      await onUnfollow(following.targetId, following.targetType);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleToggleMute = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isUser) {
      if (isMuted) {
        await unmuteUser(following.targetId);
      } else {
        await muteUser(following.targetId);
      }
    } else {
      if (isMuted) {
        await unmuteOrganization(following.targetId);
      } else {
        await muteOrganization(following.targetId);
      }
    }
  };

  const loading = isLoading || localLoading;
  const muteLoading = muteUserLoading || muteOrgLoading;

  return (
    <ListItem
      sx={{
        px: 2,
        py: 2,
        '&:hover': { bgcolor: 'action.hover' },
        alignItems: 'flex-start',
      }}
    >
      <ListItemAvatar sx={{ mt: 0.5 }}>
        <Link href={linkPath}>
          <Avatar
            src={avatarSrc || undefined}
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
                href={linkPath}
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
                  {isUser ? `@${identifier}` : identifier}
                </Typography>
              </Link>
            </Box>

            <Box sx={{ flexShrink: 0, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title={isMuted ? 'Unmute notifications' : 'Mute notifications'}>
                <IconButton
                  size="small"
                  onClick={handleToggleMute}
                  disabled={muteLoading}
                  sx={{
                    color: isMuted ? 'text.disabled' : 'text.secondary',
                    '&:hover': {
                      color: isMuted ? 'primary.main' : 'text.primary',
                    },
                  }}
                >
                  {isMuted ? <NotificationsOffIcon fontSize="small" /> : <NotificationsIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              
              <Button
                size="small"
                variant="outlined"
                startIcon={<PersonRemoveIcon />}
                onClick={handleUnfollow}
                disabled={loading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  color: 'text.secondary',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'error.main',
                    color: 'error.main',
                    bgcolor: 'error.lighter',
                  },
                }}
              >
                Unfollow
              </Button>
            </Box>
          </Box>
        }
        secondary={
          isUser && (target as FollowingUser).bio ? (
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
              {(target as FollowingUser).bio}
            </Typography>
          ) : null
        }
        slotProps={{
          secondary: { component: 'div' },
        }}
      />
    </ListItem>
  );
}
