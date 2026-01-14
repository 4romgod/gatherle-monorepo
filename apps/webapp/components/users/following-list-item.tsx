'use client';

import React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import { PersonRemove as PersonRemoveIcon } from '@mui/icons-material';
import { FollowTargetType } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';

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
  targetType: FollowTargetType;
  targetId: string;
  targetUser?: FollowingUser;
  targetOrganization?: FollowingOrg;
}

interface FollowingListItemProps {
  following: FollowingTarget;
  onUnfollow: (targetId: string, targetType: FollowTargetType) => Promise<any>;
  isLoading?: boolean;
}

export default function FollowingListItem({
  following,
  onUnfollow,
  isLoading = false,
}: FollowingListItemProps) {
  const [localLoading, setLocalLoading] = React.useState(false);

  const isUser = following.targetType === FollowTargetType.User;
  const target = isUser ? following.targetUser : following.targetOrganization;

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

  const loading = isLoading || localLoading;

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

            <Box sx={{ flexShrink: 0 }}>
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
