'use client';

import React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import FollowButton from './follow-button';
import { FollowTargetType } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';

interface FollowerUser {
  userId: string;
  username: string;
  email: string;
  given_name: string;
  family_name: string;
  profile_picture?: string;
  bio?: string;
}

interface FollowersListItemProps {
  follower: FollowerUser;
  targetType?: FollowTargetType;
}

export default function FollowersListItem({ follower, targetType = FollowTargetType.User }: FollowersListItemProps) {
  const { data: session } = useSession();

  const isCurrentUser = session?.user?.userId === follower.userId;
  const displayName = `${follower.given_name} ${follower.family_name}`.trim();

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
        <Link href={`/users/${follower.username}`}>
          <Avatar
            src={follower.profile_picture || undefined}
            alt={displayName}
            sx={{ width: 48, height: 48, cursor: 'pointer' }}
          >
            {displayName.charAt(0).toUpperCase()}
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
                href={`/users/${follower.username}`}
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
                  {displayName}
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
                  @{follower.username}
                </Typography>
              </Link>
            </Box>

            {!isCurrentUser && (
              <Box sx={{ flexShrink: 0 }}>
                <FollowButton
                  targetId={follower.userId}
                  targetType={targetType}
                  size="small"
                />
              </Box>
            )}
          </Box>
        }
        secondary={
          follower.bio && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {follower.bio}
            </Typography>
          )
        }
      />
    </ListItem>
  );
}
