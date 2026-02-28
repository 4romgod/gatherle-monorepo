'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FollowTargetType, FollowApprovalStatus } from '@/data/graphql/types/graphql';
import { useFollowing } from '@/hooks';
import FollowersList from './FollowersList';
import FollowingList from './FollowingList';

interface UserProfileStatsProps {
  userId: string;
  displayName: string;
  initialFollowersCount: number;
  initialFollowingCount: number;
  organizedEventsCount: number;
  rsvpdEventsCount: number;
  savedEventsCount: number;
  interestsCount: number;
  /** Whether this is the user's own profile (enables modals and scroll-to-section behavior) */
  isOwnProfile?: boolean;
  /** When true, removes the top border and margin (for use inline beside the avatar) */
  compact?: boolean;
}

/**
 * Displays user profile statistics including followers, following, events, etc.
 * Clickable stats either open modals (followers/following) or scroll to sections (events).
 * Note: Modals only work on own profile since we can only fetch the logged-in user's data.
 */
export default function UserProfileStats({
  userId,
  displayName,
  initialFollowersCount,
  initialFollowingCount,
  organizedEventsCount,
  rsvpdEventsCount,
  savedEventsCount,
  interestsCount,
  isOwnProfile = false,
  compact = false,
}: UserProfileStatsProps) {
  // Only fetch following data for own profile (hook returns current user's following)
  const { following, loading } = useFollowing();
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const wasFollowingRef = useRef<boolean | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Track follow status changes and update count optimistically (only for own profile)
  useEffect(() => {
    if (!isOwnProfile) return;
    // Wait for initial data to load before tracking changes
    if (loading) return;

    const existingFollow = following.find((f) => f.targetType === FollowTargetType.User && f.targetId === userId);
    const isCurrentlyFollowing = existingFollow?.approvalStatus === FollowApprovalStatus.Accepted;

    // Only adjust count after initial load is complete and state actually changed
    if (initialLoadDoneRef.current && wasFollowingRef.current !== isCurrentlyFollowing) {
      setFollowersCount((prev) => (isCurrentlyFollowing ? prev + 1 : prev - 1));
    }

    wasFollowingRef.current = isCurrentlyFollowing;
    initialLoadDoneRef.current = true;
  }, [following, userId, loading, isOwnProfile]);

  // Update following count from hook data for own profile
  useEffect(() => {
    if (isOwnProfile && !loading) {
      const acceptedCount = following.filter((f) => f.approvalStatus === FollowApprovalStatus.Accepted).length;
      setFollowingCount(acceptedCount);
    }
  }, [following, loading, isOwnProfile]);

  // Scroll to section by ID
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Common styles for clickable stat boxes
  const clickableStatSx = {
    cursor: 'pointer',
    '&:hover .stat-number': {
      color: 'primary.main',
    },
  };

  // Common styles for non-clickable stat boxes
  const staticStatSx = {};

  return (
    <>
      <Stack
        direction="row"
        spacing={compact ? { xs: 0 } : { xs: 2, sm: 4 }}
        sx={{
          ...(compact ? {} : { mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }),
          flexWrap: compact ? 'nowrap' : 'wrap',
          rowGap: compact ? 0 : 2,
          justifyContent: compact ? 'space-between' : 'flex-start',
        }}
      >
        {/* Followers - opens modal on own profile */}
        <Box
          onClick={isOwnProfile ? () => setFollowersOpen(true) : undefined}
          sx={isOwnProfile ? clickableStatSx : staticStatSx}
        >
          <Typography
            variant={compact ? 'h6' : 'h5'}
            fontWeight={700}
            color="secondary"
            className="stat-number"
            sx={{ transition: 'color 0.2s' }}
          >
            {followersCount}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: compact ? '0.6rem' : undefined }}>
            Followers
          </Typography>
        </Box>

        {/* Following - opens modal on own profile */}
        <Box
          onClick={isOwnProfile ? () => setFollowingOpen(true) : undefined}
          sx={isOwnProfile ? clickableStatSx : staticStatSx}
        >
          <Typography
            variant={compact ? 'h6' : 'h5'}
            fontWeight={700}
            color="secondary"
            className="stat-number"
            sx={{ transition: 'color 0.2s' }}
          >
            {followingCount}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: compact ? '0.6rem' : undefined }}>
            Following
          </Typography>
        </Box>

        {/* Events Created - scrolls to section on own profile */}
        <Box
          onClick={isOwnProfile ? () => scrollToSection('events-created') : undefined}
          sx={isOwnProfile ? clickableStatSx : staticStatSx}
        >
          <Typography
            variant={compact ? 'h6' : 'h5'}
            fontWeight={700}
            color="secondary"
            className="stat-number"
            sx={{ transition: 'color 0.2s' }}
          >
            {organizedEventsCount}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: compact ? '0.6rem' : undefined }}>
            {compact ? 'Events' : 'Events Created'}
          </Typography>
        </Box>

        {/* RSVPs / Events Attending - scrolls to section on own profile */}
        <Box
          onClick={isOwnProfile ? () => scrollToSection('events-attending') : undefined}
          sx={isOwnProfile ? clickableStatSx : staticStatSx}
        >
          <Typography
            variant={compact ? 'h6' : 'h5'}
            fontWeight={700}
            color="secondary"
            className="stat-number"
            sx={{ transition: 'color 0.2s' }}
          >
            {rsvpdEventsCount}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            RSVPs
          </Typography>
        </Box>

        {/* Saved Events - scrolls to section on own profile (hidden in compact mode) */}
        {isOwnProfile && !compact && (
          <Box onClick={() => scrollToSection('saved-events')} sx={clickableStatSx}>
            <Typography
              variant="h5"
              fontWeight={700}
              color="secondary"
              className="stat-number"
              sx={{ transition: 'color 0.2s' }}
            >
              {savedEventsCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Saved
            </Typography>
          </Box>
        )}

        {/* Interests - scrolls to section on own profile (hidden in compact mode) */}
        {!compact && (
          <Box
            onClick={isOwnProfile ? () => scrollToSection('interests') : undefined}
            sx={isOwnProfile ? clickableStatSx : staticStatSx}
          >
            <Typography
              variant="h5"
              fontWeight={700}
              color="secondary"
              className="stat-number"
              sx={{ transition: 'color 0.2s' }}
            >
              {interestsCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Interests
            </Typography>
          </Box>
        )}
      </Stack>

      <FollowersList
        targetId={userId}
        targetType={FollowTargetType.User}
        open={followersOpen}
        onClose={() => setFollowersOpen(false)}
        title={`${displayName}'s Followers`}
      />

      <FollowingList
        open={followingOpen}
        onClose={() => setFollowingOpen(false)}
        title={`${displayName} is Following`}
      />
    </>
  );
}
