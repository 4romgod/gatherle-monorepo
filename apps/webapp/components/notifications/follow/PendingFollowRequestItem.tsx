'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, Box, Button, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { FollowApprovalStatus } from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';

interface PendingFollowRequestItemProps {
  followId: string;
  follower: {
    userId: string;
    username: string;
    email: string;
    given_name: string;
    family_name: string;
    profile_picture?: string | null;
    bio?: string | null;
  };
  approvalStatus: FollowApprovalStatus;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  onAccept: (followId: string) => Promise<any>;
  onReject: (followId: string) => Promise<any>;
  isLoading?: boolean;
}

export default function PendingFollowRequestItem({
  followId,
  follower,
  approvalStatus,
  createdAt,
  onAccept,
  onReject,
  isLoading = false,
}: PendingFollowRequestItemProps) {
  const [localLoading, setLocalLoading] = React.useState(false);

  const displayName = `${follower.given_name} ${follower.family_name}`.trim();
  const displayHandle = follower.username ? `@${follower.username}` : displayName;
  const timestamp = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const isPending = approvalStatus === FollowApprovalStatus.Pending;

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalLoading(true);
    try {
      await onAccept(followId);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalLoading(true);
    try {
      await onReject(followId);
    } finally {
      setLocalLoading(false);
    }
  };

  const loading = isLoading || localLoading;

  return (
    <ListItem
      sx={{
        px: 2,
        py: 1.5,
        '&:hover': { bgcolor: 'action.hover' },
        alignItems: 'flex-start',
        opacity: loading ? 0.72 : 1,
        transition: 'background-color 0.2s ease, opacity 0.2s ease',
      }}
    >
      <ListItemAvatar sx={{ mt: 0.5, minWidth: 48 }}>
        <Link href={ROUTES.USERS.USER(follower.username)}>
          <Avatar
            src={follower.profile_picture || undefined}
            alt={displayName}
            sx={{ width: 40, height: 40, cursor: 'pointer' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        </Link>
      </ListItemAvatar>

      <ListItemText
        primary={
          <Box sx={{ minWidth: 0 }}>
            <Link href={ROUTES.USERS.USER(follower.username)} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.25,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {isPending ? `${displayHandle} wants to connect` : displayHandle}
              </Typography>
            </Link>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {follower.bio?.trim() || 'Requested to follow you.'}
            </Typography>
          </Box>
        }
        secondary={
          <Stack spacing={1} sx={{ mt: 0.75 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </Typography>

            {isPending ? (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAccept}
                  disabled={loading}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleReject}
                  disabled={loading}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
                >
                  Decline
                </Button>
              </Stack>
            ) : (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: 'action.selected',
                  color: 'text.secondary',
                }}
              >
                <Typography variant="caption" fontWeight={700}>
                  {approvalStatus === FollowApprovalStatus.Accepted ? 'Accepted' : 'Declined'}
                </Typography>
              </Box>
            )}
          </Stack>
        }
        slotProps={{
          secondary: { component: 'div' },
        }}
      />
    </ListItem>
  );
}
