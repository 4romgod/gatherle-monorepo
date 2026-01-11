import Link from 'next/link';
import { GetEventBySlugDocument, GetEventBySlugQuery, Location, ParticipantStatus } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { 
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip, 
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import EventCategoryChip from '@/components/events/category/chip';
import { getFullUrl } from '@/lib/utils/url';
import { RRule } from 'rrule';
import { upperFirst } from 'lodash';
import { 
  CalendarMonth, 
  LocationOn, 
  Share, 
  BookmarkBorder,
  ConfirmationNumber,
  Groups,
  Language,
  ArrowBack
} from '@mui/icons-material';
import type { Metadata } from 'next';
import CopyLinkButton from '@/components/events/copy-link-button';

export const metadata: Metadata = {
  title: {
    default: 'Ntlango',
    template: 'Ntlango',
  },
  icons: {
    icon: '/logo-img.png',
    shortcut: '/logo-img.png',
    apple: '/logo-img.png',
  },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page(props: Props) {
  const params = await props.params;
  const eventUrl = await getFullUrl(`/events/${params.slug}`);

  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
  });
  const { title, organizers, description, media, recurrenceRule, location, eventCategories, comments, participants } = eventRetrieved.readEventBySlug;

  type EventDetailParticipant = NonNullable<NonNullable<GetEventBySlugQuery['readEventBySlug']>['participants']>[number];

  const participantList = (participants ?? []) as EventDetailParticipant[];

  const getParticipantDisplayName = (participant: EventDetailParticipant) => {
    const nameParts = [participant.user?.given_name, participant.user?.family_name].filter(Boolean);
    const fallbackName = participant.user?.username || `Guest • ${participant.userId?.slice(-4) ?? 'anon'}`;
    return nameParts.length ? nameParts.join(' ') : fallbackName;
  };

  const getParticipantInitial = (participant: EventDetailParticipant) =>
    participant.user?.given_name?.charAt(0) ??
    participant.user?.username?.charAt(0) ??
    participant.userId?.charAt(0) ??
    '?';

  const getParticipantStatusLabel = (participant: EventDetailParticipant) => participant.status ?? ParticipantStatus.Going;

  const getLocationText = (location: Location): string => {
    switch (location.locationType) {
      case 'venue':
        const parts = [
          location.address?.street,
          location.address?.city,
          location.address?.state,
          location.address?.zipCode,
          location.address?.country,
        ].filter(Boolean);
        return parts.join(', ');
      case 'online':
        return 'This event will be held online.';
      case 'tba':
        return 'The location will be announced soon.';
      default:
        return '';
    }
  };

  const getRecurrenceText = (rule?: string | null): string => {
    if (!rule) {
      return 'Schedule coming soon';
    }
    try {
      return upperFirst(RRule.fromString(rule).toText());
    } catch (error) {
      console.error('Unable to parse recurrence rule', error);
      return 'Schedule coming soon';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section with Cover Image */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: 280, sm: 340, md: 380 },
          width: '100%',
          overflow: 'hidden',
          bgcolor: 'grey.900',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '45%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)',
          },
        }}
      >
        <Box
          component="img"
          src={media?.featuredImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80'}
          alt={title}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 35%',
          }}
        />
        
        {/* Back Button */}
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 16, md: 24 },
            left: { xs: 16, md: 24 },
            zIndex: 2,
          }}
        >
          <Button
            component={Link}
            href="/events"
            startIcon={<ArrowBack />}
            sx={{
              bgcolor: 'background.paper',
              backdropFilter: 'blur(10px)',
              color: 'text.primary',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: 2,
              opacity: 0.95,
              boxShadow: 2,
              '&:hover': {
                opacity: 1,
                transform: 'translateX(-4px)',
                transition: 'all 0.2s ease',
              },
            }}
          >
            Back to Events
          </Button>
        </Box>

        {/* Event Title Overlay */}
        <Container
          maxWidth="lg"
          sx={{
            position: 'absolute',
            bottom: { xs: 16, md: 20 },
            left: 0,
            right: 0,
            zIndex: 2,
          }}
        >
          <Stack spacing={1.25}>
            <Typography
              variant="h2"
              sx={{
                color: 'common.white',
                fontWeight: 800,
                fontSize: { xs: '1.625rem', sm: '2rem', md: '2.5rem' },
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Stack direction="row" spacing={1} alignItems="center">
                <Groups sx={{ color: 'common.white', fontSize: 20 }} />
                <Typography variant="body1" sx={{ color: 'common.white', fontWeight: 600 }}>
                  {participantList.length} attending
                </Typography>
              </Stack>
              {participantList.length > 0 && (
                <AvatarGroup 
                  max={5} 
                  sx={{ 
                    '& .MuiAvatar-root': { 
                      width: 32, 
                      height: 32, 
                      fontSize: '0.875rem',
                      border: '2px solid',
                      borderColor: 'common.white',
                    } 
                  }}
                >
                  {participantList.slice(0, 5).map(participant => (
                    <Avatar
                      key={participant.participantId}
                      src={participant.user?.profile_picture || undefined}
                      alt={getParticipantDisplayName(participant)}
                    >
                      {getParticipantInitial(participant)}
                    </Avatar>
                  ))}
                </AvatarGroup>
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: { xs: -4.5, md: -5.5 }, mb: 8, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4}>
          {/* Left Column - Main Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Action Card */}
            <Card
              elevation={0}
              sx={{
                mb: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'visible',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ConfirmationNumber />}
                    fullWidth
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 2,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                    }}
                  >
                    Get Tickets
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<BookmarkBorder />}
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                      },
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<Share />}
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                      },
                    }}
                  >
                    Share
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card
              elevation={0}
              sx={{
                mb: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                  About This Event
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.8,
                    fontSize: '1.05rem',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {description}
                </Typography>
              </CardContent>
            </Card>

            {/* Organizers Section */}
            <Card
              elevation={0}
              sx={{
                mb: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                  Organized By
                </Typography>
                
                {organizers.length === 0 ? (
                  <Typography color="text.secondary">No organizers listed.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {organizers
                      .filter((organizer) => organizer.user)
                      .map((organizer) => (
                        <Link
                          key={organizer.user.userId}
                          href={`/users/${organizer.user.username}`}
                          passHref
                          style={{ textDecoration: 'none' }}
                        >
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'action.hover',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                              },
                            }}
                          >
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar
                                src={organizer.user.profile_picture || undefined}
                                alt={`${organizer.user.given_name || organizer.user.username}`}
                                sx={{ width: 64, height: 64 }}
                              >
                                {!organizer.user.profile_picture &&
                                  (
                                    organizer.user.given_name?.charAt(0) ||
                                    organizer.user.username?.charAt(0) ||
                                    '?'
                                  ).toUpperCase()}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" fontWeight={700}>
                                  {organizer.user.given_name && organizer.user.family_name
                                    ? `${organizer.user.given_name} ${organizer.user.family_name}`
                                    : organizer.user.username || 'Unknown User'}
                                </Typography>
                                {organizer.user.username && (organizer.user.given_name || organizer.user.family_name) && (
                                  <Typography variant="body2" color="text.secondary">
                                    @{organizer.user.username}
                                  </Typography>
                                )}
                                <Chip
                                  label={organizer.role}
                                  size="small"
                                  color="primary"
                                  sx={{ mt: 1, fontWeight: 600 }}
                                />
                              </Box>
                            </Stack>
                          </Paper>
                        </Link>
                      ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Participants Section */}
            <Card
              elevation={0}
              sx={{
                mb: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                  Who's Going
                </Typography>
                
                {participantList.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                    }}
                  >
                    <Groups sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary" variant="body1">
                      Be the first to RSVP!
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        mb: 3,
                      }}
                    >
                      {participantList.slice(0, 12).map(participant => (
                        <Tooltip
                          key={participant.participantId}
                          title={`${getParticipantDisplayName(participant)} · ${getParticipantStatusLabel(participant)}`}
                          arrow
                        >
                          <Avatar
                            src={participant.user?.profile_picture || undefined}
                            sx={{
                              width: 56,
                              height: 56,
                              border: '3px solid',
                              borderColor: 'background.paper',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'scale(1.1)',
                                borderColor: 'primary.main',
                                zIndex: 1,
                              },
                            }}
                          >
                            {getParticipantInitial(participant)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </Box>
                    
                    {participantList.length > 12 && (
                      <Button
                        variant="text"
                        sx={{ fontWeight: 600 }}
                      >
                        View all {participantList.length} participants
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Event Details Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              {/* Date & Time Card */}
              <Card
                elevation={0}
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2.5}>
                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
                        <CalendarMonth sx={{ fontSize: 24, color: 'primary.main', mt: 0.5 }} />
                        <Box>
                          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1 }}>
                            Date & Time
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                            {getRecurrenceText(recurrenceRule)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider />

                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <LocationOn sx={{ fontSize: 24, color: 'primary.main', mt: 0.5 }} />
                        <Box>
                          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1 }}>
                            Location
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                            {location.locationType === 'online' && (
                              <Chip
                                icon={<Language />}
                                label="Online Event"
                                size="small"
                                color="success"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                            {location.locationType !== 'online' && getLocationText(location)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider />

                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <ConfirmationNumber sx={{ fontSize: 24, color: 'primary.main', mt: 0.5 }} />
                        <Box>
                          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1 }}>
                            Admission
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                            Free
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Categories Card */}
              {eventCategories.length > 0 && (
                <Card
                  elevation={0}
                  sx={{
                    mb: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1, mb: 2, display: 'block' }}>
                      Categories
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {eventCategories.map((category, index) => (
                        <EventCategoryChip key={`${category.name}.${index}`} category={category} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Share Card */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Share sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                    Share this event with friends
                  </Typography>
                  <CopyLinkButton url={eventUrl} />
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
