'use client';
import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Avatar, Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import {
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Cake as CakeIcon,
  Event as EventIcon,
  Badge as BadgeIcon,
  CalendarMonth,
} from '@mui/icons-material';
import {
  GetAllEventsDocument,
  GetSavedEventsDocument,
  GetUserByUsernameDocument,
  GetUserByUsernameQuery,
  User,
} from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import EventsCarousel from '@/components/events/carousel';
import EventCategoryBadge from '@/components/events/category/EventCategoryBadge';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import UserProfileStats from '@/components/users/UserProfileStats';
import UserProfileActions from '@/components/users/UserProfileActions';
import UserProfilePageSkeleton from '@/components/users/UserProfilePageSkeleton';
import { differenceInYears, format } from 'date-fns';
import { getDisplayName } from '@/lib/utils';

interface UserProfilePageClientProps {
  username: string;
}

export default function UserProfilePageClient({ username }: UserProfilePageClientProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const isOwnProfile = session?.user?.username === username;

  const {
    data: userData,
    loading: userLoading,
    error: userError,
  } = useQuery<GetUserByUsernameQuery>(GetUserByUsernameDocument, {
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
    .filter((event): event is NonNullable<typeof event> => Boolean(event)) as EventPreview[];

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
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: 'secondary.main',
          color: 'secondary.contrastText',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
          >
            <Box sx={{ height: 200, position: 'relative', bgcolor: 'primary.main' }}>
              {isOwnProfile ? (
                <Link href={ROUTES.ACCOUNT.ROOT}>
                  <Button
                    startIcon={<EditIcon />}
                    variant="contained"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      boxShadow: 2,
                      '&:hover': {
                        bgcolor: 'background.default',
                        boxShadow: 4,
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

            <Box sx={{ px: { xs: 3, sm: 4 }, pb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', mt: -8 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={user.profile_picture || '/api/placeholder/120/120'}
                    alt={`${user.given_name} ${user.family_name}`}
                    sx={{
                      width: 140,
                      height: 140,
                      border: '5px solid',
                      borderColor: 'background.paper',
                      boxShadow: 3,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      width: 24,
                      height: 24,
                      bgcolor: 'success.main',
                      borderRadius: '50%',
                      border: '3px solid',
                      borderColor: 'background.paper',
                    }}
                  />
                </Box>
                <Box sx={{ ml: 3, mb: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      icon={<BadgeIcon />}
                      label={user.userRole}
                      size="small"
                      color="secondary"
                      sx={{ borderRadius: 1.5, fontWeight: 600 }}
                    />
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <InfoItem icon={<LocationIcon />} label="Location" value={user.location?.city || 'Unknown'} />
                    <InfoItem icon={<EmailIcon />} label="Email" value={user.email || 'Not available'} />
                    <InfoItem icon={<PhoneIcon />} label="Phone" value={user.phone_number ?? 'Not shared'} />
                  </Box>
                </Paper>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                    About {getDisplayName(user)}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {user.bio || 'No bio yet.'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {interests.map((interest) => (
                      <EventCategoryBadge key={interest.name} category={interest} />
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <InfoItem icon={<EventIcon />} label="RSVPs" value={`${rsvpdEvents.length}`} />
                    <InfoItem icon={<CalendarMonth />} label="Age" value={age ? `${age}` : 'N/A'} />
                    {formattedDOB && <InfoItem icon={<CakeIcon />} label="Born" value={formattedDOB} />}
                  </Stack>
                </Paper>
                {rsvpdEvents.length > 0 && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      RSVPed Events
                    </Typography>
                    <EventsCarousel events={rsvpdEvents} title="" showIndicators={false} viewAllEventsButton={false} />
                  </Paper>
                )}
                {organizedEvents.length > 0 && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Organized Events
                    </Typography>
                    <EventsCarousel
                      events={organizedEvents}
                      title=""
                      showIndicators={false}
                      viewAllEventsButton={false}
                    />
                  </Paper>
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={3}>
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
                {savedEvents.length > 0 && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Saved Events
                    </Typography>
                    <EventsCarousel events={savedEvents} title="" showIndicators={false} viewAllEventsButton={false} />
                  </Paper>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
