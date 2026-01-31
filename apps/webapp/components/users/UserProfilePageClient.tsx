'use client';
import Link from 'next/link';
import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  Badge as BadgeIcon,
  CalendarMonth,
  Cake as CakeIcon,
  CheckCircle as RSVPIcon,
  Email as EmailIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Bookmark as BookmarkIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  FollowApprovalStatus,
  FollowTargetType,
  GetAllEventsDocument,
  GetSavedEventsDocument,
  GetUserByUsernameDocument,
} from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import Carousel from '@/components/carousel';
import EventBoxSm from '@/components/events/eventBoxSm';
import EventCategoryBadge from '@/components/categories/CategoryBadge';
import UserProfileStats from '@/components/users/UserProfileStats';
import UserProfileActions from '@/components/users/UserProfileActions';
import UserProfilePageSkeleton from '@/components/users/UserProfilePageSkeleton';
import {
  ROUTES,
  CARD_STYLES,
  BUTTON_STYLES,
  SECTION_TITLE_STYLES,
  EMPTY_STATE_ICON_STYLES,
  EMPTY_STATE_STYLES,
  SPACING,
} from '@/lib/constants';
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

  const rsvpdEvents = useMemo(
    () => events.filter((event) => event.participants?.some((p) => p.userId === user?.userId)),
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
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
            <Box
              sx={{
                height: { xs: 180, md: 240 },
                position: 'relative',
                bgcolor: 'primary.main',
              }}
            >
              {isOwnProfile ? (
                <Link href={ROUTES.ACCOUNT.ROOT}>
                  <Button
                    startIcon={<EditIcon />}
                    variant="outlined"
                    size="small"
                    sx={{
                      ...BUTTON_STYLES,
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      bgcolor: 'background.paper',
                      borderColor: 'divider',
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
                <Box
                  sx={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                  }}
                >
                  <UserProfileActions userId={user.userId} username={user.username} />
                </Box>
              )}
            </Box>

            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', mt: -8 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={getAvatarSrc(user)}
                    alt={`${user.given_name} ${user.family_name}`}
                    sx={{
                      width: { xs: 120, md: 140 },
                      height: { xs: 120, md: 140 },
                      border: '4px solid',
                      borderColor: 'common.white',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: { xs: 8, md: 10 },
                      right: { xs: 8, md: 10 },
                      width: { xs: 20, md: 24 },
                      height: { xs: 20, md: 24 },
                      bgcolor: 'success.main',
                      borderRadius: '50%',
                      border: '3px solid',
                      borderColor: 'common.white',
                    }}
                  />
                </Box>
                <Box sx={{ ml: 3, mb: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      icon={<BadgeIcon />}
                      label={user.userRole}
                      size="small"
                      color="primary"
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'capitalize' }}
                    />
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.75rem', md: '2.25rem' },
                    mb: 1,
                    lineHeight: 1.2,
                  }}
                >
                  {user.given_name} {user.family_name}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, mb: 2 }}>
                  @{user.username}
                </Typography>
                {user.bio && (
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, lineHeight: 1.6 }}>
                    {user.bio}
                  </Typography>
                )}
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
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card
                    elevation={0}
                    sx={{
                      ...CARD_STYLES,
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="h6" sx={SECTION_TITLE_STYLES} gutterBottom>
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
                          <InfoItem icon={<LocationIcon fontSize="small" />} label="Location" value={locationText} />
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
                </Grid>

                <Grid id="interests" size={{ xs: 12, md: 6 }}>
                  <Card
                    elevation={0}
                    sx={{
                      ...CARD_STYLES,
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="h6" sx={SECTION_TITLE_STYLES} gutterBottom>
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
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No interests selected yet
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box id="events-created">
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      letterSpacing: '0.1em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <EventIcon sx={{ fontSize: 20 }} />
                    MY EVENTS
                  </Typography>
                  <Typography variant="h5" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
                    Events Created
                  </Typography>
                </Box>
                {organizedEvents.length > 0 ? (
                  <Carousel
                    items={organizedEvents}
                    title=""
                    autoplay
                    autoplayInterval={6000}
                    itemWidth={350}
                    showIndicators
                    renderItem={(event) => <EventBoxSm event={event} />}
                  />
                ) : (
                  <Card elevation={0} sx={CARD_STYLES}>
                    <Box sx={EMPTY_STATE_STYLES}>
                      <Box sx={EMPTY_STATE_ICON_STYLES}>
                        <CalendarMonth sx={{ fontSize: 48, color: 'text.secondary' }} />
                      </Box>
                      <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                        No events created yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                        Start hosting events and they'll appear here
                      </Typography>
                      {emptyCreatedCTA}
                    </Box>
                  </Card>
                )}
              </Box>

              <Box id="events-attending">
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      letterSpacing: '0.1em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <RSVPIcon sx={{ fontSize: 20 }} />
                    ATTENDING
                  </Typography>
                  <Typography variant="h5" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
                    Events Attending
                  </Typography>
                </Box>
                {rsvpdEvents.length > 0 ? (
                  <Carousel
                    items={rsvpdEvents}
                    title=""
                    autoplay
                    autoplayInterval={6000}
                    itemWidth={350}
                    showIndicators
                    renderItem={(event) => <EventBoxSm event={event} />}
                  />
                ) : (
                  <Card elevation={0} sx={CARD_STYLES}>
                    <Box sx={EMPTY_STATE_STYLES}>
                      <Box sx={EMPTY_STATE_ICON_STYLES}>
                        <RSVPIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                      </Box>
                      <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                        No RSVPs yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                        Browse events and RSVP to ones you're interested in
                      </Typography>
                      <Button
                        variant="contained"
                        color="secondary"
                        component={Link}
                        href={ROUTES.EVENTS.ROOT}
                        sx={{ ...BUTTON_STYLES, mt: 2 }}
                      >
                        Explore Events
                      </Button>
                    </Box>
                  </Card>
                )}
              </Box>

              <Box id="saved-events">
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      letterSpacing: '0.1em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <BookmarkIcon sx={{ fontSize: 20 }} />
                    SAVED
                  </Typography>
                  <Typography variant="h5" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
                    Saved Events
                  </Typography>
                </Box>
                {savedEvents.length > 0 ? (
                  <Carousel
                    items={savedEvents}
                    title=""
                    autoplay
                    autoplayInterval={6000}
                    itemWidth={350}
                    showIndicators
                    renderItem={(event) => <EventBoxSm event={event} />}
                  />
                ) : (
                  <Card elevation={0} sx={CARD_STYLES}>
                    <Box sx={EMPTY_STATE_STYLES}>
                      <Box sx={EMPTY_STATE_ICON_STYLES}>
                        <BookmarkIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                      </Box>
                      <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                        No saved events yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                        Save events you're interested in to view them later
                      </Typography>
                      <Button
                        variant="contained"
                        color="secondary"
                        component={Link}
                        href={ROUTES.EVENTS.ROOT}
                        sx={{ ...BUTTON_STYLES, mt: 2 }}
                      >
                        Explore Events
                      </Button>
                    </Box>
                  </Card>
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
        </Stack>
      </Container>
    </Box>
  );
}
