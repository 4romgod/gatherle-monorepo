import Link from 'next/link';
import { GetEventBySlugDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { Box, Typography, Grid, Avatar, Container, Chip, Stack, Card, CardContent, Divider, Button, Paper } from '@mui/material';
import { getEventCategoryIcon } from '@/lib/constants';
import EventOperationsModal from '@/components/modal/event-operations';
import { RRule } from 'rrule';
import { ParticipantStatus } from '@/data/graphql/types/graphql';
import { CalendarMonth, LocationOn, People, ArrowBack, Edit } from '@mui/icons-material';
import { EventDetail } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page(props: Props) {
  const params = await props.params;

  // TODO this page should be accessible only to the event organizer
  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
  });

  const event = eventRetrieved.readEventBySlug as EventDetail;
  const tags = event.tags ?? {};
  const comments = event.comments ?? {};
  const participants = event.participants ?? [];
  const coverImage = event.media?.featuredImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

  return (
    <Box>
      {/* Hero Section with Cover */}
      <Box sx={{ position: 'relative', bgcolor: 'background.default' }}>
        <Box
          sx={{
            height: { xs: 280, sm: 340, md: 380 },
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={coverImage}
            alt={event.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '45%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
            }}
          />

          {/* Back & Edit Buttons */}
          <Box
            sx={{
              position: 'absolute',
              top: 24,
              left: 24,
              right: 24,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Button
              component={Link}
              href={ROUTES.ACCOUNT.EVENTS.ROOT}
              startIcon={<ArrowBack />}
              sx={{
                bgcolor: 'background.paper',
                opacity: 0.95,
                backdropFilter: 'blur(10px)',
                px: 2,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'background.paper',
                  opacity: 1,
                },
              }}
            >
              Back
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                component={Link}
                href={ROUTES.ACCOUNT.EVENTS.EDIT(params.slug)}
                startIcon={<Edit />}
                variant="contained"
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                }}
              >
                Edit Event
              </Button>
              <EventOperationsModal event={event} />
            </Box>
          </Box>

          {/* Title Overlay */}
          <Container
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 2,
              pb: 3,
            }}
          >
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                color: 'common.white',
                fontSize: { xs: '1.625rem', sm: '2rem', md: '2.5rem' },
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                lineHeight: 1.2,
              }}
            >
              {event.title}
            </Typography>
          </Container>
        </Box>
      </Box>

      {/* Main Content */}
      <Container sx={{ mt: -6, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Description Card */}
            <Card
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: '0.1em' }}>
                  Event Details
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2, lineHeight: 1.3 }}>
                  {event.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {event.description}
                </Typography>

                {/* Event Categories */}
                {event.eventCategories.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                      CATEGORIES
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {event.eventCategories.map(category => {
                        const IconComponent = getEventCategoryIcon(category.iconName);
                        return (
                          <Chip
                            key={category.eventCategoryId}
                            icon={<IconComponent />}
                            label={category.name}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Organizers Card */}
            <Card
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                  Organizers
                </Typography>
                <Stack spacing={2}>
                  {event.organizers.map(organizer => (
                    <Link
                      key={organizer.user.userId}
                      href={`/users/${organizer.user.username}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            src={organizer.user.profile_picture || undefined}
                            sx={{ width: 48, height: 48 }}
                          >
                            {(organizer.user.given_name?.charAt(0) || organizer.user.username?.charAt(0) || '?').toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {organizer.user.given_name && organizer.user.family_name
                                ? `${organizer.user.given_name} ${organizer.user.family_name}`
                                : organizer.user.username || 'Unknown User'}
                            </Typography>
                            <Chip label={organizer.role} size="small" />
                          </Box>
                        </Stack>
                      </Paper>
                    </Link>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Participants Card */}
            <Card
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <People sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={700}>
                    RSVPs ({participants.length})
                  </Typography>
                </Box>
                {participants.length > 0 ? (
                  <Stack spacing={1}>
                    {participants.map(participant => (
                      <Chip
                        key={participant.participantId}
                        avatar={<Avatar>{participant.userId.charAt(0).toUpperCase()}</Avatar>}
                        label={`${participant.userId.slice(0, 8)}... (${participant.status || ParticipantStatus.Going})`}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    No RSVPs yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: { md: 'sticky' }, top: 24 }}>
              {/* Event Info Card */}
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
                  <Typography variant="overline" color="text.secondary" fontWeight={600}>
                    Event Information
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={2}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <CalendarMonth sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          SCHEDULE
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>
                        {RRule.fromString(event.recurrenceRule).toText()}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <LocationOn sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          LOCATION
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>
                        {event.location?.details || event.location?.address?.city || 'TBA'}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Tags Card */}
              {Object.keys(tags).length > 0 && (
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight={600}>
                      Tags
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={1}>
                      {Object.entries(tags).map(([key, value]) => (
                        <Chip
                          key={key}
                          label={`${key}: ${value}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
