import React, { Suspense } from 'react';
import type { Metadata } from 'next';
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
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Cake as CakeIcon,
  Wc as GenderIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { auth } from '@/auth';
import { differenceInYears, format } from 'date-fns';
import {
  GetAllEventsDocument,
  GetUserByUsernameDocument,
  GetSavedEventsDocument,
  ParticipantStatus,
} from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import EventCategoryBadge from '@/components/categories/CategoryBadge';
import { EventPreview } from '@/data/graphql/query/Event/types';
import UserProfileStats from '@/components/users/UserProfileStats';
import ProfileEventsTabs from '@/components/users/ProfileEventsTabs';
import { ROUTES, CARD_STYLES, BUTTON_STYLES, SECTION_TITLE_STYLES, SPACING } from '@/lib/constants';
import { omit } from 'lodash';
import Link from 'next/link';
import { getAvatarSrc, logger, isApolloAuthError, getAuthHeader } from '@/lib/utils';
import UserProfilePageSkeleton from '@/components/users/UserProfilePageSkeleton';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Profile',
  description: 'Review your profile details, activity, interests, and saved events.',
  noIndex: true,
});

export default function UserPublicProfile() {
  return (
    <Suspense fallback={<UserProfilePageSkeleton />}>
      <AuthenticatedProfileContent />
    </Suspense>
  );
}

async function AuthenticatedProfileContent() {
  const session = await auth();
  if (!session) return null;
  const sessionUser = omit(session.user, ['token', '__typename']);
  const token = session.user.token;
  logger.debug('[Profile] Token present:', !!token, 'Username:', sessionUser.username);

  // Query user to get followersCount and other data
  const { data: userData } = await getClient().query({
    query: GetUserByUsernameDocument,
    variables: { username: sessionUser.username },
  });
  const user = userData.readUserByUsername;
  if (!user) return null;

  // Query events with auth so myRsvp / isSavedByMe resolve for the viewer
  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
    context: { headers: getAuthHeader(token) },
  });

  // Saved events query requires auth - handle token expiry gracefully
  let savedEventsData;
  try {
    const result = await getClient().query({
      query: GetSavedEventsDocument,
      context: { headers: getAuthHeader(token) },
      fetchPolicy: 'no-cache',
    });
    savedEventsData = result.data;
    logger.debug('[Profile] Saved events fetched:', savedEventsData?.readSavedEvents?.length ?? 0);
  } catch (error: unknown) {
    logger.error('[Profile] Error fetching saved events:', error);

    const isAuthError = isApolloAuthError(error);
    logger.debug('[Profile] Is auth error:', isAuthError);

    if (isAuthError) {
      logger.info('[Profile] Token expired - redirecting to login');
      // Redirect to login when token is expired
      redirect(ROUTES.AUTH.LOGIN);
    }
    // For other errors, just continue with empty saved events
    savedEventsData = null;
  }

  const allEvents = (events.readEvents ?? []) as EventPreview[];
  const rsvpdEvents = allEvents.filter((event) =>
    event.participants?.some((p) => p.userId === user.userId && p.status !== ParticipantStatus.Cancelled),
  );
  const organizedEvents = allEvents.filter((event) =>
    event.organizers.some((organizer) => organizer.user.userId === user.userId),
  );

  // Extract saved events from follow records
  const savedEvents = (savedEventsData?.readSavedEvents ?? [])
    .map((follow) => follow.targetEvent)
    .filter((event): event is NonNullable<typeof event> => event !== null && event !== undefined) as EventPreview[];

  const interests = user.interests ? user.interests : [];
  const age = differenceInYears(new Date(), new Date(user.birthdate));
  const formattedDOB = format(new Date(user.birthdate), 'dd MMMM yyyy');

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={SPACING.relaxed}>
          {/* Profile Header Card */}
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
              {/* Top row: Avatar + Name + Edit button */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, md: 3 } }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={getAvatarSrc(session?.user)}
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
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
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
                        <Chip
                          icon={<BadgeIcon />}
                          label={user.userRole}
                          size="small"
                          color="primary"
                          sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'capitalize' }}
                        />
                      </Stack>
                    </Box>
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
                  </Box>
                  {user.bio && (
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, lineHeight: 1.6, mt: 1 }}>
                      {user.bio}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Stats */}
              <UserProfileStats
                userId={user.userId}
                displayName={`${user.given_name} ${user.family_name}`.trim()}
                initialFollowersCount={user.followersCount ?? 0}
                initialFollowingCount={0}
                organizedEventsCount={organizedEvents.length}
                rsvpdEventsCount={rsvpdEvents.length}
                savedEventsCount={savedEvents.length}
                interestsCount={interests.length}
                isOwnProfile={true}
              />
            </CardContent>
          </Card>

          {/* 2-Column Layout: Sidebar + Events */}
          <Grid container spacing={SPACING.standard}>
            {/* Sidebar */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ position: { md: 'sticky' }, top: 24 }}>
                <Stack spacing={SPACING.standard}>
                  {/* Personal Information */}
                  <Card elevation={0} sx={CARD_STYLES}>
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
                          <InfoItem
                            icon={<LocationIcon fontSize="small" />}
                            label="Location"
                            value={user.location ? `${user.location.city}, ${user.location.country}` : 'Not provided'}
                          />
                          <InfoItem
                            icon={<CakeIcon fontSize="small" />}
                            label="Birthday"
                            value={`${formattedDOB} (${age} years old)`}
                          />
                          <InfoItem
                            icon={<GenderIcon fontSize="small" />}
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
                        <Typography variant="h6" sx={SECTION_TITLE_STYLES} gutterBottom>
                          Interests
                        </Typography>
                        <Divider />
                        {interests.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
                            {interests.map((category, index) => (
                              <EventCategoryBadge key={`${category ?? 'interest'}-${index}`} category={category} />
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
                </Stack>
              </Box>
            </Grid>

            {/* Main Content - Tabbed Events */}
            <Grid size={{ xs: 12, md: 8 }}>
              <ProfileEventsTabs
                organizedEvents={organizedEvents}
                rsvpdEvents={rsvpdEvents}
                savedEvents={savedEvents}
                isOwnProfile={true}
                emptyCreatedCta={
                  <Button
                    component={Link}
                    href={ROUTES.ACCOUNT.EVENTS.CREATE}
                    variant="contained"
                    color="secondary"
                    sx={{ ...BUTTON_STYLES, mt: 2 }}
                  >
                    Create Your First Event
                  </Button>
                }
              />
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
