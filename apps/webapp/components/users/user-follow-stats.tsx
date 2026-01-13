'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FollowTargetType, FollowApprovalStatus } from '@/data/graphql/types/graphql';
import { useFollowing } from '@/hooks';

interface UserFollowStatsProps {
  userId: string;
  initialFollowersCount: number;
  organizedEventsCount: number;
  rsvpdEventsCount: number;
  interestsCount: number;
}

export default function UserFollowStats({
  userId,
  initialFollowersCount,
  organizedEventsCount,
  rsvpdEventsCount,
  interestsCount,
}: UserFollowStatsProps) {
  const { following, loading } = useFollowing();
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const wasFollowingRef = useRef<boolean | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Track follow status changes and update count optimistically
  useEffect(() => {
    // Wait for initial data to load before tracking changes
    if (loading) return;

    const existingFollow = following.find(
      f => f.targetType === FollowTargetType.User && f.targetId === userId
    );
    const isCurrentlyFollowing = existingFollow?.approvalStatus === FollowApprovalStatus.Accepted;

    // Only adjust count after initial load is complete and state actually changed
    if (initialLoadDoneRef.current && wasFollowingRef.current !== isCurrentlyFollowing) {
      setFollowersCount(prev => isCurrentlyFollowing ? prev + 1 : prev - 1);
    }

    wasFollowingRef.current = isCurrentlyFollowing;
    initialLoadDoneRef.current = true;
  }, [following, userId, loading]);

  return (
    <Stack
      direction="row"
      spacing={4}
      sx={{
        mt: 3,
        pt: 3,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box>
        <Typography variant="h5" fontWeight={700} color="secondary">
          {followersCount}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Followers
        </Typography>
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700} color="secondary">
          {organizedEventsCount}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Events Created
        </Typography>
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700} color="secondary">
          {rsvpdEventsCount}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Events Attending
        </Typography>
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700} color="secondary">
          {interestsCount}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Interests
        </Typography>
      </Box>
    </Stack>
  );
}
