import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
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
  Event as EventIcon,
  CheckCircle as RSVPIcon,
  Badge as BadgeIcon,
  CalendarMonth,
} from '@mui/icons-material';
import { auth } from '@/auth';
import { differenceInYears, format } from 'date-fns';
import { GetAllEventsDocument, GetUserByUsernameDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import EventsCarousel from '@/components/events/carousel';
import EventCategoryChip from '@/components/events/category/chip';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';
import { omit } from 'lodash';
import Link from 'next/link';
import FollowButton from '@/components/users/follow-button';
import UserFollowStats from '@/components/users/user-follow-stats';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserPage(props: Props) {
  const params = await props.params;
  const session = await auth();

  const { data: userRetrieved } = await getClient().query({
    query: GetUserByUsernameDocument,
    variables: { username: params.username },
  });
  const user = omit(userRetrieved.readUserByUsername, ['__typename']);

  const isOwnProfile = session?.user?.username === user.username;

  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
  });
  const allEvents = (events.readEvents ?? []) as EventPreview[];
  const rsvpdEvents = allEvents.filter(event => event.participants?.some(p => p.userId === user.userId));
  const organizedEvents = allEvents.filter(event =>
    event.organizers.some(organizer => organizer.user.userId === user.userId),
  );
  const interests = user.interests ? user.interests : [];
  const age = user.birthdate ? differenceInYears(new Date(), new Date(user.birthdate)) : null;
  const formattedDOB = user.birthdate ? format(new Date(user.birthdate), 'dd MMMM yyyy') : null;

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
          {/* Profile Header Card */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Cover Image */}
            <Box
              sx={{
                height: 200,
                position: 'relative',
                bgcolor: 'primary.main',
              }}
            >
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
                  <FollowButton targetId={user.userId} size="small" />
                </Box>
              )}
            </Box>

            {/* Profile Info */}
            <Box sx={{ px: { xs: 3, sm: 4 }, pb: 4 }}>
              {/* Avatar */}
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

              {/* Name and Username */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  {user.given_name} {user.family_name}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  @{user.username}
                </Typography>
                {user.bio && (
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, lineHeight: 1.6 }}>
                    {user.bio}
                  </Typography>
                )}
              </Box>

              {/* Stats */}
              <UserFollowStats
                userId={user.userId}
                displayName={`${user.given_name} ${user.family_name}`.trim()}
                initialFollowersCount={user.followersCount ?? 0}
                organizedEventsCount={organizedEvents.length}
                rsvpdEventsCount={rsvpdEvents.length}
                interestsCount={interests.length}
              />
            </Box>
          </Paper>

          {/* Details Grid */}
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Personal Information
                  </Typography>
                  <Divider />
                  <Stack spacing={0} divider={<Divider />}>
                    {isOwnProfile && <InfoItem icon={<EmailIcon fontSize="small" />} label="Email" value={user.email} />}
                    {isOwnProfile && (
                      <InfoItem
                        icon={<PhoneIcon fontSize="small" />}
                        label="Phone"
                        value={user.phone_number || 'Not provided'}
                      />
                    )}
                    <InfoItem
                      icon={<LocationIcon fontSize="small" />}
                      label="Address"
                      value={user.address ? `${user.address.city}, ${user.address.country}` : 'Not provided'}
                    />
                    {formattedDOB && (
                      <InfoItem
                        icon={<CakeIcon fontSize="small" />}
                        label="Birthday"
                        value={`${formattedDOB}${age ? ` (${age} years old)` : ''}`}
                      />
                    )}
                    <InfoItem
                      icon={<GenderIcon fontSize="small" />}
                      label="Gender"
                      value={user.gender || 'Not specified'}
                    />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            {/* Interests */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Interests
                  </Typography>
                  <Divider />
                  {interests.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
                      {interests.map((category, index) => (
                        <EventCategoryChip key={index} category={category} />
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
              </Paper>
            </Grid>
          </Grid>

          {/* Events Created */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <EventIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Events Created
              </Typography>
            </Stack>
            {organizedEvents.length > 0 ? (
              <EventsCarousel
                events={organizedEvents}
                title=""
                autoplay={true}
                autoplayInterval={6000}
                itemWidth={350}
                showIndicators={true}
                viewAllEventsButton={false}
              />
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                }}
              >
                <CalendarMonth sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No events created yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {isOwnProfile ? "Start hosting events and they'll appear here" : `${user.given_name} hasn't created any events yet`}
                </Typography>
                {isOwnProfile && (
                  <Button
                    variant="contained"
                    color="secondary"
                    component={Link}
                    href={ROUTES.ACCOUNT.EVENTS.CREATE}
                    sx={{ borderRadius: 2 }}
                  >
                    Create Your First Event
                  </Button>
                )}
              </Paper>
            )}
          </Box>

          {/* Events Attending */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <RSVPIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Events Attending
              </Typography>
            </Stack>
            {rsvpdEvents.length > 0 ? (
              <EventsCarousel
                events={rsvpdEvents}
                title=""
                autoplay={true}
                autoplayInterval={6000}
                itemWidth={350}
                showIndicators={true}
                viewAllEventsButton={false}
              />
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                }}
              >
                <RSVPIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No RSVPs yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {isOwnProfile ? "Browse events and RSVP to ones you're interested in" : `${user.given_name} hasn't RSVP'd to any events yet`}
                </Typography>
                {isOwnProfile && (
                  <Button
                    variant="contained"
                    color="secondary"
                    component={Link}
                    href={ROUTES.EVENTS.ROOT}
                    sx={{ borderRadius: 2 }}
                  >
                    Explore Events
                  </Button>
                )}
              </Paper>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
