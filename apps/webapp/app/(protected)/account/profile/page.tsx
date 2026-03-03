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
  FilterOperatorInput,
  GetAllEventsDocument,
  GetMyRsvpsDocument,
  GetUserByUsernameDocument,
  GetSavedEventsDocument,
} from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import EventCategoryBadge from '@/components/categories/CategoryBadge';
import { EventPreview } from '@/data/graphql/query/Event/types';
import UserProfileStats from '@/components/users/UserProfileStats';
import ProfileEventsTabs from '@/components/users/ProfileEventsTabs';
import { ROUTES, CARD_STYLES, BUTTON_STYLES, SECTION_TITLE_STYLES, SPACING } from '@/lib/constants';
import { omit } from 'lodash';
import Link from 'next/link';
import { getAvatarSrc, logger, isApolloAuthError, getAuthHeader, isEventUpcoming } from '@/lib/utils';
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

  // Run queries in parallel: RSVPs (auth-scoped), hosted events (filtered), user data
  const [myRsvpsResult, organizedEventsResult] = await Promise.all([
    getClient().query({
      query: GetMyRsvpsDocument,
      variables: { includeCancelled: false },
      context: { headers: getAuthHeader(token) },
      fetchPolicy: 'no-cache',
    }),
    getClient().query({
      query: GetAllEventsDocument,
      variables: {
        options: {
          filters: [
            {
              field: 'organizers.user.userId',
              operator: FilterOperatorInput.Eq,
              value: user.userId,
            },
          ],
        },
      },
      context: { headers: getAuthHeader(token) },
    }),
  ]);

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

  const rsvpRecords = myRsvpsResult.data?.myRsvps ?? [];
  const allRsvpdEvents = rsvpRecords.map((r) => r.event).filter((e): e is EventPreview => e != null);
  const upcomingRsvpdEvents = allRsvpdEvents.filter((e) => isEventUpcoming(e.recurrenceRule));
  const pastRsvpdEvents = allRsvpdEvents.filter((e) => !isEventUpcoming(e.recurrenceRule));
  const organizedEvents = (organizedEventsResult.data?.readEvents ?? []) as EventPreview[];

  // Extract saved events from follow records
  const savedEvents = (savedEventsData?.readSavedEvents ?? [])
    .map((follow) => follow.targetEvent)
    .filter((event): event is NonNullable<typeof event> => event !== null && event !== undefined) as EventPreview[];

  const interests = user.interests ? user.interests : [];
  const age = user.birthdate ? differenceInYears(new Date(), new Date(user.birthdate)) : null;
  const formattedDOB = user.birthdate ? format(new Date(user.birthdate), 'dd MMMM yyyy') : null;

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
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              {/* Constrain header content width and center it on large screens (Instagram-style) */}
              <Box sx={{ maxWidth: 560, mx: 'auto' }}>
                {/* Row 1: Avatar (left) + Stats (right) — Instagram style */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 3, md: 4 }, mb: 2 }}>
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      src={getAvatarSrc(session?.user)}
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
                      displayName={`${user.given_name} ${user.family_name}`.trim()}
                      initialFollowersCount={user.followersCount ?? 0}
                      initialFollowingCount={0}
                      organizedEventsCount={organizedEvents.length}
                      rsvpdEventsCount={allRsvpdEvents.length}
                      savedEventsCount={savedEvents.length}
                      interestsCount={interests.length}
                      isOwnProfile={true}
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

                {/* Row 3: @username + role chip */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: user.bio ? 0.75 : 1.5, mt: 0.25 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
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

                {/* Row 4: Bio */}
                {user.bio && (
                  <Typography variant="body2" sx={{ lineHeight: 1.55, mb: 1.5, maxWidth: 480 }}>
                    {user.bio}
                  </Typography>
                )}

                {/* Row 5: Full-width Edit Profile button */}
                <Link href={ROUTES.ACCOUNT.ROOT} style={{ display: 'block' }}>
                  <Button
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
                </Link>
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={SPACING.standard}>
            {/* Main Content - Tabbed Events */}
            <Grid size={{ xs: 12 }}>
              <ProfileEventsTabs
                organizedEvents={organizedEvents}
                upcomingRsvpdEvents={upcomingRsvpdEvents}
                pastRsvpdEvents={pastRsvpdEvents}
                savedEvents={savedEvents}
                isOwnProfile={true}
                emptyCreatedCta={
                  <Link href={ROUTES.ACCOUNT.EVENTS.CREATE} style={{ textDecoration: 'none' }}>
                    <Button variant="contained" color="secondary" sx={{ ...BUTTON_STYLES, mt: 2 }}>
                      Create Your First Event
                    </Button>
                  </Link>
                }
              />
            </Grid>
            <Grid container>
              {/* Personal Information */}
              <Grid size={{ xs: 12, md: 6 }}>
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
                          value={
                            formattedDOB && age != null
                              ? `${formattedDOB} (${age} years old)`
                              : (formattedDOB ?? 'Not provided')
                          }
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
              </Grid>
              {/* Interests */}
              <Grid size={{ xs: 12, md: 6 }}>
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
              </Grid>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
