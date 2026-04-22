'use client';
import Link from 'next/link';
import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import {
  FollowApprovalStatus,
  FollowTargetType,
  GetAllEventsDocument,
  GetMyRsvpsDocument,
  GetSavedEventsDocument,
  GetUserByUsernameDocument,
  ParticipantStatus,
  SocialVisibility,
} from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import ProfileEventsTabs from '@/components/users/ProfileEventsTabs';
import UserProfileStats from '@/components/users/UserProfileStats';
import UserProfileActions from '@/components/users/UserProfileActions';
import UserProfilePageSkeleton from '@/components/users/UserProfilePageSkeleton';
import UserAvatarMomentsRing from '@/components/eventMoments/UserAvatarMomentsRing';
import { ROUTES, BUTTON_STYLES, SPACING } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import { isEventUpcoming, logger } from '@/lib/utils';
import { getAvatarSrc, getDisplayName } from '@/lib/utils/general';
import { canViewUserDetails, getVisibilityLabel as getVisibilityLabelText } from '@/components/users/visibility-utils';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';
import { useFollowing } from '@/hooks/useFollow';
import ErrorPage from '@/components/errors/ErrorPage';

interface UserProfilePageClientProps {
  username: string;
}

export default function UserProfilePageClient({ username }: UserProfilePageClientProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const isOwnProfile = session?.user?.username === username;
  const viewerUserId = session?.user?.userId;

  const { following } = useFollowing();
  const followingUserIds = useMemo(() => {
    const set = new Set<string>();
    following?.forEach((follow) => {
      if (
        follow.targetType === FollowTargetType.User &&
        follow.approvalStatus === FollowApprovalStatus.Accepted &&
        follow.targetId
      ) {
        set.add(follow.targetId);
      }
    });
    return set;
  }, [following]);

  const {
    data: userData,
    loading: userLoading,
    error: userError,
  } = useQuery(GetUserByUsernameDocument, {
    variables: { username },
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: eventsData,
    loading: eventsLoading,
    error: eventsError,
  } = useQuery(GetAllEventsDocument, {
    fetchPolicy: 'cache-and-network',
    context: { headers: getAuthHeader(token) },
  });

  const { data: savedData, loading: savedLoading } = useQuery(GetSavedEventsDocument, {
    skip: !isOwnProfile || !token,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const { data: myRsvpsData, loading: myRsvpsLoading } = useQuery(GetMyRsvpsDocument, {
    variables: { includeCancelled: false },
    skip: !isOwnProfile || !token,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const user = userData?.readUserByUsername ?? null;
  const events = (eventsData?.readEvents ?? []) as EventPreview[];
  const savedEvents = (savedData?.readSavedEvents ?? [])
    .map((follow) => follow.targetEvent)
    .filter((event) => Boolean(event)) as EventPreview[];

  const viewerCanSeeProfile = Boolean(
    user &&
    canViewUserDetails({
      viewerId: viewerUserId,
      userId: user.userId,
      defaultVisibility: user.defaultVisibility,
      followingIds: followingUserIds,
    }),
  );
  const shouldMaskProfileDetails = Boolean(user && !viewerCanSeeProfile && !isOwnProfile);
  const detailBlurSx = shouldMaskProfileDetails
    ? { filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', transition: 'filter 0.2s ease' }
    : undefined;
  const maskLabel = user ? getVisibilityLabelText(user.defaultVisibility) : 'Private profile';
  const canMessageUser = Boolean(
    user &&
    viewerUserId &&
    !isOwnProfile &&
    (followingUserIds.has(user.userId) || user.defaultVisibility === SocialVisibility.Public),
  );

  // For own profile use the dedicated myRsvps query; for others filter all events
  const allRsvpdEvents = useMemo(() => {
    if (isOwnProfile && myRsvpsData?.myRsvps) {
      const rsvpdEvents = myRsvpsData.myRsvps
        .map((r) => {
          if (!r.event) {
            logger.warn('UserProfilePageClient: myRsvps entry without associated event encountered');
            return null;
          }
          return r.event;
        })
        .filter((e): e is EventPreview => e != null);
      return rsvpdEvents;
    }
    return events.filter((event) =>
      event.participants?.some((p) => p.userId === user?.userId && p.status !== ParticipantStatus.Cancelled),
    );
  }, [isOwnProfile, myRsvpsData, events, user?.userId]);

  const upcomingRsvpdEvents = useMemo(
    () => allRsvpdEvents.filter((e) => isEventUpcoming(e.primarySchedule.recurrenceRule)),
    [allRsvpdEvents],
  );
  const pastRsvpdEvents = useMemo(
    () => allRsvpdEvents.filter((e) => !isEventUpcoming(e.primarySchedule.recurrenceRule)),
    [allRsvpdEvents],
  );
  const organizedEvents = useMemo(
    () => events.filter((event) => event.organizers.some((organizer) => organizer.user.userId === user?.userId)),
    [events, user?.userId],
  );

  const profileMomentEvents = useMemo(() => {
    const byId = new Map<string, { eventId: string; title: string }>();
    [...organizedEvents, ...allRsvpdEvents].forEach((e) => {
      if (!byId.has(e.eventId)) {
        byId.set(e.eventId, { eventId: e.eventId, title: e.title });
      }
    });
    return Array.from(byId.values());
  }, [organizedEvents, allRsvpdEvents]);

  const interests = user?.interests ?? [];

  const isLoading = userLoading || eventsLoading || (isOwnProfile && (savedLoading || myRsvpsLoading));
  const hasError = userError || eventsError;
  const notFoundError = isNotFoundGraphQLError(userError);

  if (notFoundError) {
    return (
      <ErrorPage
        statusCode={404}
        title="Profile not found"
        message="This user account doesn’t exist or has been removed."
        ctaLabel="Browse users"
        ctaHref={ROUTES.USERS.ROOT}
      />
    );
  }

  if (hasError) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
        Unable to load this profile right now.
      </Typography>
    );
  }

  if (isLoading || !user) {
    return <UserProfilePageSkeleton />;
  }

  const emptyCreatedCTA = isOwnProfile ? (
    <Button
      variant="contained"
      color="secondary"
      component={Link}
      href={ROUTES.ACCOUNT.EVENTS.CREATE}
      sx={{ ...BUTTON_STYLES, mt: 2 }}
    >
      Create Your First Event
    </Button>
  ) : (
    <Button
      variant="contained"
      color="secondary"
      component={Link}
      href={ROUTES.EVENTS.ROOT}
      sx={{ ...BUTTON_STYLES, mt: 2 }}
    >
      Explore Events
    </Button>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 935, mx: 'auto', width: '100%', overflowX: 'hidden' }}>
        <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 4 }, pb: 2 }}>
          <Box sx={{ maxWidth: 560, mx: 'auto' }}>
            {/* Row 1: Avatar (left) + Stats (right) — Instagram style */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 3, md: 4 }, mb: 2 }}>
              <UserAvatarMomentsRing
                userId={user.userId}
                avatarSrc={getAvatarSrc(user) || undefined}
                displayName={`${user.given_name} ${user.family_name}`}
                events={profileMomentEvents}
                token={token}
                isOwnProfile={isOwnProfile}
              />

              {/* Stats inline beside avatar (compact = no top border/margin) */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <UserProfileStats
                  userId={user.userId}
                  displayName={getDisplayName(user)}
                  initialFollowersCount={user.followersCount ?? 0}
                  initialFollowingCount={0}
                  organizedEventsCount={organizedEvents.length}
                  rsvpdEventsCount={allRsvpdEvents.length}
                  savedEventsCount={savedEvents.length}
                  interestsCount={interests.length}
                  isOwnProfile={false}
                  compact
                />
              </Box>
            </Box>

            {/* Row 2: Display name */}
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.3 }}>
              {user.given_name} {user.family_name}
            </Typography>

            {/* Row 3: @username */}
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: user.bio ? 0.75 : 1.5 }}>
              @{user.username}
            </Typography>

            {/* Row 4: Bio */}
            {user.bio && (
              <Typography variant="body2" sx={{ lineHeight: 1.55, mb: 1.5, maxWidth: 480 }}>
                {user.bio}
              </Typography>
            )}

            {/* Row 5: Full-width action buttons */}
            {isOwnProfile ? (
              <Button
                component={Link}
                href={ROUTES.ACCOUNT.ROOT}
                variant="outlined"
                fullWidth
                startIcon={<EditIcon />}
                sx={{
                  ...BUTTON_STYLES,
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'background.default',
                    borderColor: 'text.secondary',
                  },
                }}
              >
                Edit Profile
              </Button>
            ) : (
              <UserProfileActions
                userId={user.userId}
                username={user.username}
                canMessage={canMessageUser}
                messageHref={ROUTES.ACCOUNT.MESSAGE_WITH_USERNAME(user.username)}
                fullWidth
              />
            )}
          </Box>
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Box sx={detailBlurSx}>
            <Box sx={{ overflow: 'hidden' }}>
              <Grid container spacing={SPACING.standard}>
                {/* ── Main content: tabbed events ── */}
                <Grid size={{ xs: 12 }}>
                  <ProfileEventsTabs
                    upcomingRsvpdEvents={upcomingRsvpdEvents}
                    pastRsvpdEvents={pastRsvpdEvents}
                    organizedEvents={organizedEvents}
                    savedEvents={savedEvents}
                    isOwnProfile={isOwnProfile}
                    emptyCreatedCta={emptyCreatedCTA}
                  />
                </Grid>

              </Grid>
            </Box>
          </Box>
          {shouldMaskProfileDetails && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: 3,
                bgcolor: 'rgba(0, 0, 0, 0.65)',
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                px: { xs: 2, md: 6 },
                py: { xs: 3, md: 6 },
              }}
            >
              <Stack spacing={1.25} alignItems="center">
                <Typography variant="h6" fontWeight={700} color="common.white">
                  {maskLabel}
                </Typography>
                <Typography variant="body2" color="common.white">
                  Follow @{user.username} to unlock this profile.
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
