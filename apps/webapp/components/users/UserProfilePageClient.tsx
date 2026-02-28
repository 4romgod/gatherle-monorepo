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
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              {/* Top row: Avatar + Name + Actions */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, md: 3 } }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={getAvatarSrc(user)}
                    alt={`${user.given_name} ${user.family_name}`}
                    sx={{
                      width: { xs: 80, md: 100 },
                      height: { xs: 80, md: 100 },
                      border: '3px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      width: 16,
                      height: 16,
                      bgcolor: 'success.main',
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: 'background.paper',
                    }}
                  />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    }}
                  >
                    <Box>
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: '1.5rem', md: '2rem' },
                          mb: 0.5,
                          lineHeight: 1.2,
                        }}
                      >
                        {user.given_name} {user.family_name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                          @{user.username}
                        </Typography>
                      </Stack>
                    </Box>
                    {isOwnProfile ? (
                      <Link href={ROUTES.ACCOUNT.ROOT}>
                        <Button
                          startIcon={<EditIcon />}
                          variant="outlined"
                          size="small"
                          sx={{
                            ...BUTTON_STYLES,
                            borderColor: 'divider',
                            flexShrink: 0,
                            '&:hover': {
                              bgcolor: 'background.default',
                              borderColor: 'text.secondary',
                            },
                          }}
                        >
                          Edit Profile
                        </Button>
                      </Link>
                    ) : (
                      <UserProfileActions
                        userId={user.userId}
                        username={user.username}
                        canMessage={canMessageUser}
                        messageHref={ROUTES.ACCOUNT.MESSAGE_WITH_USERNAME(user.username)}
                      />
                    )}
                  </Box>
                  {user.bio && (
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, lineHeight: 1.6, mt: 1 }}>
                      {user.bio}
                    </Typography>
                  )}
                </Box>
              </Box>

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
              />
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
