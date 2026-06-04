'use client';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Box, Button, Stack, Typography } from '@mui/material';
import {
  FollowApprovalStatus,
  FollowTargetType,
  GetMyRsvpsDocument,
  GetUserByUsernameDocument,
  SocialVisibility,
} from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import ProfileEventsTabs from '@/components/users/ProfileEventsTabs';
import UserProfileActions from '@/components/users/UserProfileActions';
import UserProfilePageSkeleton from '@/components/users/UserProfilePageSkeleton';
import UserAvatarMomentsRing from '@/components/eventMoments/UserAvatarMomentsRing';
import { ROUTES, BUTTON_STYLES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import { getAvatarSrc, getDisplayName } from '@/lib/utils/general';
import { canViewUserDetails, getVisibilityLabel as getVisibilityLabelText } from '@/components/users/visibility-utils';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';
import { useFollowing } from '@/hooks/useFollow';
import { useHostedEventsByUser } from '@/hooks/useHostedEventsByUser';
import { useMyEventOccurrenceRsvps } from '@/hooks/useMyEventOccurrenceRsvps';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useUserEventOccurrences } from '@/hooks/useUserEventOccurrences';
import ErrorPage from '@/components/errors/ErrorPage';
import { ProfileActionButton } from '@/components/users/ProfileActionButton';
import { ProfileBadge } from '@/components/users/ProfileBadge';
import { ProfileStat } from '@/components/users/ProfileStat';
import { buildProfileBadges } from '@/lib/profileBadges';
import { FiEdit2, FiSettings } from 'react-icons/fi';
import type { ProfileEventsTabKey } from '@/components/users/ProfileEventsTabs';

interface UserProfilePageClientProps {
  hideOwnProfileActions?: boolean;
  initialEventsTabKey?: ProfileEventsTabKey | null;
  username: string;
}

export default function UserProfilePageClient({
  hideOwnProfileActions = false,
  initialEventsTabKey = null,
  username,
}: UserProfilePageClientProps) {
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

  const { data: myRsvpsData, loading: myRsvpsLoading } = useQuery(GetMyRsvpsDocument, {
    variables: { includeCancelled: true }, // fetch cancelled too — moments persist after cancellation
    skip: !isOwnProfile || !token,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const user = userData?.readUserByUsername ?? null;
  const [hostedEventsSearchTerm, setHostedEventsSearchTerm] = useState('');
  const {
    error: hostedEventsError,
    hostedEvents,
    hasMore: hostedEventsHasMore,
    loading: hostedEventsLoading,
    loadingMore: hostedEventsLoadingMore,
    loadMore: loadMoreHostedEvents,
    totalCount: hostedEventsTotalCount,
  } = useHostedEventsByUser(user?.userId, token, { searchTerm: hostedEventsSearchTerm });
  const {
    error: participantEventsError,
    loading: participantEventsLoading,
    occurrences: participantOccurrences,
    pastEvents: participantPastEvents,
    upcomingEvents: participantUpcomingEvents,
  } = useUserEventOccurrences(user?.userId, token, { enabled: !isOwnProfile });
  const {
    error: savedEventsError,
    loading: savedLoading,
    savedEvents,
  } = useSavedEvents(token, { enabled: isOwnProfile });
  const {
    error: myOccurrenceRsvpsError,
    loading: myOccurrenceRsvpsLoading,
    pastEvents: myPastRsvpEvents,
    upcomingEvents: myUpcomingRsvpEvents,
  } = useMyEventOccurrenceRsvps(token, false, { enabled: isOwnProfile });

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

  const upcomingRsvpdEvents = isOwnProfile ? myUpcomingRsvpEvents : participantUpcomingEvents;
  const pastRsvpdEvents = isOwnProfile ? myPastRsvpEvents : participantPastEvents;
  const organizedEventsForMoments = hostedEvents;

  // Moments ring needs ALL events the user was ever a participant in (including cancelled RSVPs)
  // because moments persist after RSVP cancellation.
  const allRsvpdEventsForMoments = useMemo(() => {
    if (isOwnProfile && myRsvpsData?.myRsvps) {
      return myRsvpsData.myRsvps.map((r) => r.event).filter((e): e is EventPreview => e != null);
    }
    return participantOccurrences.flatMap((occurrence) => (occurrence.eventSeries ? [occurrence.eventSeries] : []));
  }, [isOwnProfile, myRsvpsData, participantOccurrences]);

  const profileMomentEvents = useMemo(() => {
    const byId = new Map<string, { eventId: string; title: string }>();
    [...organizedEventsForMoments, ...allRsvpdEventsForMoments].forEach((e) => {
      if (!byId.has(e.eventId)) {
        byId.set(e.eventId, { eventId: e.eventId, title: e.title });
      }
    });
    return Array.from(byId.values());
  }, [organizedEventsForMoments, allRsvpdEventsForMoments]);

  const profileBadges = useMemo(() => buildProfileBadges({ userRole: user?.userRole }), [user?.userRole]);
  const interestLabels = useMemo(() => user?.interests?.filter(Boolean) ?? [], [user?.interests]);

  const isLoading =
    userLoading ||
    (hostedEventsLoading && hostedEvents.length === 0) ||
    participantEventsLoading ||
    (isOwnProfile && (savedLoading || myRsvpsLoading || myOccurrenceRsvpsLoading));
  const hasError =
    userError ||
    hostedEventsError ||
    participantEventsError ||
    (isOwnProfile ? savedEventsError || myOccurrenceRsvpsError : null);
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
        <Box sx={{ px: { xs: 2.5, md: 3 }, pt: { xs: 1.25, md: 4 }, pb: { xs: 1.5, md: 2 } }}>
          <Box sx={{ maxWidth: 560, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 }, mb: { xs: 1.5, md: 1.75 } }}>
              <UserAvatarMomentsRing
                userId={user.userId}
                avatarSrc={getAvatarSrc(user) || undefined}
                displayName={getDisplayName(user)}
                events={profileMomentEvents}
                token={token}
                isOwnProfile={isOwnProfile}
              />

              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 1.125, md: 1.5 },
                  justifyContent: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 0.75, md: 1 } }}>
                  <Typography
                    sx={(theme) => ({
                      color: theme.palette.text.primary,
                      fontFamily: theme.typography.body1.fontFamily,
                      fontSize: { xs: '0.95rem', md: '1rem' },
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                    })}
                  >
                    @{user.username}
                  </Typography>

                  {profileBadges.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                      {profileBadges.map((badge) => (
                        <ProfileBadge badge={badge} key={badge.label} />
                      ))}
                    </Box>
                  ) : null}
                </Box>

                <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, justifyContent: 'space-between' }}>
                  <ProfileStat
                    href={ROUTES.USERS.USER_EVENTS(user.username)}
                    label="Events"
                    value={String(hostedEventsTotalCount)}
                  />
                  <ProfileStat
                    href={ROUTES.USERS.USER_FOLLOWERS(user.username)}
                    label="Followers"
                    value={String(user.followersCount ?? 0)}
                  />
                  <ProfileStat
                    href={ROUTES.USERS.USER_FOLLOWING(user.username)}
                    label="Following"
                    value={String(user.followingCount ?? 0)}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography
                sx={(theme) => ({
                  color: theme.palette.text.primary,
                  fontFamily: theme.typography.h4.fontFamily,
                  fontSize: { xs: '1.05rem', md: '1.1875rem' },
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.2,
                })}
              >
                {getDisplayName(user)}
              </Typography>

              <Typography
                sx={(theme) => ({
                  color: theme.palette.text.primary,
                  fontFamily: theme.typography.body1.fontFamily,
                  fontSize: { xs: '0.8125rem', md: '0.875rem' },
                  fontWeight: 400,
                  lineHeight: { xs: 1.45, md: 1.5 },
                  maxWidth: 480,
                })}
              >
                {user.bio || 'Add a short intro so people know what kinds of experiences and communities pull you in.'}
              </Typography>
            </Box>

            {interestLabels.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.08em' }}>
                  Interests
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {interestLabels.map((interest) => (
                    <Box
                      key={interest.eventCategoryId}
                      sx={{
                        px: 1.5,
                        py: 0.9,
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      {interest.name}
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}

            {(!isOwnProfile || !hideOwnProfileActions) && (
              <Box sx={{ display: 'flex', gap: 1, mt: { xs: 1.5, md: 1.75 } }}>
                {isOwnProfile ? (
                  <>
                    <ProfileActionButton href={ROUTES.ACCOUNT.TAB('profile')} icon={FiEdit2} label="Edit profile" />
                    <ProfileActionButton href={ROUTES.ACCOUNT.TAB('account')} icon={FiSettings} label="Settings" />
                  </>
                ) : (
                  <UserProfileActions
                    userId={user.userId}
                    username={user.username}
                    canMessage={canMessageUser}
                    messageHref={ROUTES.ACCOUNT.MESSAGE_WITH_USERNAME(user.username)}
                    fullWidth
                    showOverflow={false}
                  />
                )}
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Box sx={detailBlurSx}>
            <Box sx={{ overflow: 'hidden' }}>
              {hostedEventsError ? (
                <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
                  We couldn&apos;t load this member&apos;s hosted events right now.
                </Typography>
              ) : (
                <ProfileEventsTabs
                  initialTabKey={initialEventsTabKey}
                  hostedEventsSearchTerm={hostedEventsSearchTerm}
                  hostedEventsTotalCount={hostedEventsTotalCount}
                  upcomingRsvpdEvents={upcomingRsvpdEvents}
                  pastRsvpdEvents={pastRsvpdEvents}
                  organizedEvents={hostedEvents}
                  organizedEventsHasMore={hostedEventsHasMore}
                  organizedEventsLoadingMore={hostedEventsLoadingMore}
                  onLoadMoreOrganized={loadMoreHostedEvents}
                  onHostedEventsSearchChange={setHostedEventsSearchTerm}
                  savedEvents={savedEvents}
                  isOwnProfile={isOwnProfile}
                  emptyCreatedCta={emptyCreatedCTA}
                />
              )}
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
