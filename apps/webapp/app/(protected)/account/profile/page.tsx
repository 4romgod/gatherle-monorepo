import React from 'react';
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
  Event as EventIcon,
  CheckCircle as RSVPIcon,
  Badge as BadgeIcon,
  CalendarMonth,
} from '@mui/icons-material';
import { auth } from '@/auth';
import { differenceInYears, format } from 'date-fns';
import { GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import EventsCarousel from '@/components/events/carousel';
import EventCategoryChip from '@/components/events/category/chip';
import { EventPreview } from '@/data/graphql/query/Event/types';
import {
  ROUTES,
  CARD_STYLES,
  BUTTON_STYLES,
  SECTION_TITLE_STYLES,
  EMPTY_STATE_STYLES,
  EMPTY_STATE_ICON_STYLES,
  SPACING,
} from '@/lib/constants';
import { omit } from 'lodash';
import Link from 'next/link';
import { getAvatarSrc } from '@/lib/utils';

export default async function UserPublicProfile() {
  const session = await auth();
  if (!session) return;
  const user = omit(session.user, ['token', '__typename']);

  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
  });
  const allEvents = (events.readEvents ?? []) as EventPreview[];
  const rsvpdEvents = allEvents.filter(event => event.participants?.some(p => p.userId === user.userId));
  const organizedEvents = allEvents.filter(event =>
    event.organizers.some(organizer => organizer.user.userId === user.userId),
  );
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
            <Box
              sx={{
                height: { xs: 180, md: 240 },
                position: 'relative',
                bgcolor: 'primary.main',
              }}
            >
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
            </Box>

            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', mt: -8 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={getAvatarSrc(session?.user)}
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

              {/* Name and Username */}
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

              {/* Stats */}
              <Stack
                direction="row"
                spacing={4}
                sx={{
                  mt: 3,
                  pt: 3,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    {organizedEvents.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
                    Events Created
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    {rsvpdEvents.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
                    Events Attending
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    {interests.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
                    Interests
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <Grid container spacing={SPACING.standard}>
            {/* Personal Information */}
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
                      <InfoItem
                        icon={<LocationIcon fontSize="small" />}
                        label="Address"
                        value={user.address ? `${user.address.city}, ${user.address.country}` : 'Not provided'}
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
            </Grid>

            {/* Interests */}
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
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Events Created */}
          <Box>
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
                  <Button
                    variant="contained"
                    color="secondary"
                    component={Link}
                    href={ROUTES.ACCOUNT.EVENTS.CREATE}
                    sx={{ ...BUTTON_STYLES, mt: 2 }}
                  >
                    Create Your First Event
                  </Button>
                </Box>
              </Card>
            )}
          </Box>

          {/* Events Attending */}
          <Box>
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
        </Stack>
      </Container>
    </Box>
  );
}
