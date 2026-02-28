'use client';
import Link from 'next/link';
import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Avatar, Box, Button, Card, CardContent, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import {
  Cake as CakeIcon,
  Email as EmailIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  FollowApprovalStatus,
  FollowTargetType,
  GetAllEventsDocument,
  GetSavedEventsDocument,
  GetUserByUsernameDocument,
  ParticipantStatus,
  SocialVisibility,
} from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import EventCategoryBadge from '@/components/categories/CategoryBadge';
import ProfileEventsTabs from '@/components/users/ProfileEventsTabs';
import UserProfileStats from '@/components/users/UserProfileStats';
import UserProfileActions from '@/components/users/UserProfileActions';
import UserProfilePageSkeleton from '@/components/users/UserProfilePageSkeleton';
import { ROUTES, CARD_STYLES, BUTTON_STYLES, SECTION_TITLE_STYLES, SPACING } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import { getAvatarSrc, getDisplayName } from '@/lib/utils/general';
import { differenceInYears, format } from 'date-fns';
import { canViewUserDetails, getVisibilityLabel as getVisibilityLabelText } from '@/components/users/visibility-utils';
import ErrorPage from '@/components/errors/ErrorPage';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';
import { useFollowing } from '@/hooks/useFollow';

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

  const rsvpdEvents = useMemo(
    () =>
      events.filter((event) =>
        event.participants?.some((p) => p.userId === user?.userId && p.status !== ParticipantStatus.Cancelled),
      ),
    [events, user?.userId],
  );
  const organizedEvents = useMemo(
    () => events.filter((event) => event.organizers.some((organizer) => organizer.user.userId === user?.userId)),
    [events, user?.userId],
  );

  const interests = user?.interests ?? [];
  const age = user?.birthdate ? differenceInYears(new Date(), new Date(user.birthdate)) : null;
  const formattedDOB = user?.birthdate ? format(new Date(user.birthdate), 'dd MMMM yyyy') : null;

  const isLoading = userLoading || eventsLoading || (isOwnProfile && savedLoading);
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

  const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.75rem' }}
        >
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );

  const locationText = user.location ? `${user.location.city}, ${user.location.country}` : 'Not provided';
  const birthdayText = formattedDOB ? `${formattedDOB} (${age} years old)` : 'Not provided';

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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={SPACING.relaxed}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              {/* Constrain header content width and center it on large screens (Instagram-style) */}
              <Box sx={{ maxWidth: 560, mx: 'auto' }}>
                {/* Row 1: Avatar (left) + Stats (right) — Instagram style */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 3, md: 4 }, mb: 2 }}>
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      src={getAvatarSrc(user)}
                      alt={`${user.given_name} ${user.family_name}`}
                      sx={{
                        width: { xs: 80, md: 96 },
                        height: { xs: 80, md: 96 },
                        border: '3px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        width: 14,
                        height: 14,
                        bgcolor: 'success.main',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: 'background.paper',
                      }}
                    />
                  </Box>

                  {/* Stats inline beside avatar (compact = no top border/margin) */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <UserProfileStats
                      userId={user.userId}
                      displayName={getDisplayName(user)}
                      initialFollowersCount={user.followersCount ?? 0}
                      initialFollowingCount={0}
                      organizedEventsCount={organizedEvents.length}
                      rsvpdEventsCount={rsvpdEvents.length}
                      savedEventsCount={savedEvents.length}
                      interestsCount={interests.length}
                      isOwnProfile={isOwnProfile}
                      compact
                    />
                  </Box>
                </Box>

                {/* Row 2: Display name */}
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.3 }}
                >
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
              {/* end centering box */}
            </CardContent>
          </Card>

          <Box sx={{ position: 'relative' }}>
            <Box sx={detailBlurSx}>
              <Grid container spacing={SPACING.standard}>
                {/* ── Sidebar ── */}
                <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 2, md: 1 } }}>
                  <Box sx={{ position: { md: 'sticky' }, top: 24 }}>
                    <Stack spacing={SPACING.standard}>
                      {/* Personal Information */}
                      <Card elevation={0} sx={CARD_STYLES}>
                        <CardContent>
                          <Stack spacing={2}>
                            <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                              Personal Information
                            </Typography>
                            <Divider />
                            <Stack spacing={0} divider={<Divider />}>
                              <InfoItem icon={<EmailIcon fontSize="small" />} label="Email" value={user.email} />
                              <InfoItem
                                icon={<PhoneIcon fontSize="small" />}
                                label="Phone"
                                value={user.phone_number || 'Not provided'}
                              />
                              <InfoItem
                                icon={<LocationIcon fontSize="small" />}
                                label="Location"
                                value={locationText}
                              />
                              <InfoItem icon={<CakeIcon fontSize="small" />} label="Birthday" value={birthdayText} />
                              <InfoItem
                                icon={<EventIcon fontSize="small" />}
                                label="Gender"
                                value={user.gender || 'Not specified'}
                              />
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>

                      {/* Interests */}
                      <Card id="interests" elevation={0} sx={CARD_STYLES}>
                        <CardContent>
                          <Stack spacing={2}>
                            <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                              Interests
                            </Typography>
                            <Divider />
                            {interests.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
                                {interests
                                  .filter((interest) => interest.eventCategoryId != null)
                                  .map((interest) => (
                                    <EventCategoryBadge key={interest.eventCategoryId} category={interest} />
                                  ))}
                              </Box>
                            ) : (
                              <Box sx={{ textAlign: 'center', py: 3 }}>
                                <Typography variant="body2" color="text.secondary">
                                  No interests selected yet
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Stack>
                  </Box>
                </Grid>

                {/* ── Main content: tabbed events ── */}
                <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 1, md: 2 } }}>
                  <ProfileEventsTabs
                    organizedEvents={organizedEvents}
                    rsvpdEvents={rsvpdEvents}
                    savedEvents={savedEvents}
                    isOwnProfile={isOwnProfile}
                    emptyCreatedCta={emptyCreatedCTA}
                  />
                </Grid>
              </Grid>
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
        </Stack>
      </Container>
    </Box>
  );
}
