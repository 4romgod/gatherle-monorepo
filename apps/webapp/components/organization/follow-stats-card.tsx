'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { People } from '@mui/icons-material';
import { FollowTargetType, FollowApprovalStatus } from '@/data/graphql/types/graphql';
import { useFollowing } from '@/hooks';
import FollowButton from '@/components/users/follow-button';

interface FollowStatsCardProps {
  orgId: string;
  initialFollowersCount: number;
}

export default function FollowStatsCard({ orgId, initialFollowersCount }: FollowStatsCardProps) {
  const { following, loading } = useFollowing();
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const wasFollowingRef = useRef<boolean | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Track follow status changes and update count optimistically
  useEffect(() => {
    // Wait for initial data to load before tracking changes
    if (loading) return;

    const existingFollow = following.find(
      f => f.targetType === FollowTargetType.Organization && f.targetId === orgId
    );
    const isCurrentlyFollowing = existingFollow?.approvalStatus === FollowApprovalStatus.Accepted;

    // Only adjust count after initial load is complete and state actually changed
    if (initialLoadDoneRef.current && wasFollowingRef.current !== isCurrentlyFollowing) {
      setFollowersCount(prev => isCurrentlyFollowing ? prev + 1 : prev - 1);
    }

    wasFollowingRef.current = isCurrentlyFollowing;
    initialLoadDoneRef.current = true;
  }, [following, orgId, loading]);

  return (
    <Card
      elevation={0}
      sx={{
        mb: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Community
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 3 }}>
          <People sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h4" fontWeight={700}>
            {followersCount.toLocaleString()}
          </Typography>
          <Typography color="text.secondary">followers</Typography>
        </Box>
        <FollowButton
          targetId={orgId}
          targetType={FollowTargetType.Organization}
          fullWidth
          variant="primary"
        />
      </CardContent>
    </Card>
  );
}
