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
  Stack,
  Typography,
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { FollowApprovalStatus } from '@/data/graphql/types/graphql';

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
        py: 2,
        '&:hover': isPending ? { bgcolor: 'action.hover' } : {},
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
              </Link>
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
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              {isPending ? (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CheckIcon />}
                    onClick={handleAccept}
                    disabled={loading}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      minWidth: 90,
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CloseIcon />}
                    onClick={handleReject}
                    disabled={loading}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      minWidth: 90,
                    }}
                  >
                    Reject
                  </Button>
                </>
              ) : (
                <Box
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    bgcolor: 'action.selected',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    {approvalStatus === FollowApprovalStatus.Accepted ? 'Accepted' : 'Rejected'}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        }
        secondary={
          <Box sx={{ mt: 1 }}>
            {follower.bio && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {follower.bio}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </Typography>
          </Box>
        }
        slotProps={{
          secondary: { component: 'div' },
        }}
      />
    </ListItem>
  );
}
