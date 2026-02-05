'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Theme,
  Typography,
} from '@mui/material';
import {
  CalendarMonth,
  LocationOn,
  Share,
  ConfirmationNumber,
  Groups,
  Language,
  ArrowBack,
  Business,
} from '@mui/icons-material';
import {
  FollowApprovalStatus,
  FollowTargetType,
  GetEventBySlugDocument,
  ParticipantStatus,
} from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import EventCategoryBadge from '@/components/categories/CategoryBadge';
import CopyLinkButton from '@/components/events/CopyLinkButton';
import EventDetailActions from '@/components/events/EventDetailActions';
import EventDetailSkeleton from '@/components/events/EventDetailSkeleton';
import EventLocationMap from '@/components/events/EventLocationMap';
import { formatLocationText } from '@/components/events/location-utils';
import {
  EventParticipant,
  getParticipantChipColor,
  getParticipantDisplayName,
  getParticipantStatusLabel,
  canViewerSeeParticipant,
  getVisibilityLabel,
} from '@/components/events/participant-utils';
import { formatRecurrenceRule } from '@/components/events/date-utils';
import UserPreviewItem from '@/components/users/UserPreviewItem';
import { useFollowing } from '@/hooks/useFollow';
import ErrorPage from '@/components/errors/ErrorPage';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';

interface EventDetailPageClientProps {
  slug: string;
}

export default function EventDetailPageClient({ slug }: EventDetailPageClientProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const { data, loading, error } = useQuery(GetEventBySlugDocument, {
    variables: { slug },
    context: {
      headers: getAuthHeader(token),
    },
    fetchPolicy: 'cache-and-network',
  });

  const event = data?.readEventBySlug;
  const participantList = (event?.participants ?? []) as EventParticipant[];

  const goingCount = participantList.filter(
    (p) => p.status === ParticipantStatus.Going || p.status === ParticipantStatus.CheckedIn,
  ).length;
  const interestedCount = participantList.filter((p) => p.status === ParticipantStatus.Interested).length;
  const waitlistedCount = participantList.filter((p) => p.status === ParticipantStatus.Waitlisted).length;

  const eventUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/events/${slug}`;
    }
    return `${window.location.origin}/events/${slug}`;
  }, [slug]);

  const attendeePreview = participantList.slice(0, 3);
  const attendeeRoute = ROUTES.EVENTS.ATTENDEES(slug);
  const previewPaperSx = (theme: Theme) => ({
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
      boxShadow: theme.shadows[3],
    },
  });
  const previewPaperProps = {
    elevation: 0,
    sx: previewPaperSx,
  };
  const contentPadding = { xs: 1, md: 2 };
  const { following } = useFollowing();
  const viewerUserId = session?.user?.userId;
  const followingUserIds = useMemo(() => {
    const set = new Set<string>();
    following.forEach((follow) => {
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
  const canViewAttendee = (user?: EventParticipant['user']) =>
    canViewerSeeParticipant(user, viewerUserId, followingUserIds);

  const notFoundError = isNotFoundGraphQLError(error);
  const isLoading = loading || (!event && !error);

  if (notFoundError) {
    return (
      <ErrorPage
        statusCode={404}
        title="Event not found"
        message="We couldn’t find an event with that slug. It may have been removed or the link is incorrect."
        ctaLabel="Browse events"
        ctaHref={ROUTES.EVENTS.ROOT}
      />
    );
  }

  if (isLoading) {
    return <EventDetailSkeleton />;
  }

  if (error || !event) {
    return (
      <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
        Unable to load this event right now.
      </Typography>
    );
  }

  const {
    title,
    organizers: organizerData,
    description,
    media,
    recurrenceRule,
    location,
    eventCategories,
    eventId,
    isSavedByMe,
    myRsvp,
  } = event;

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
          '&::after': (theme) => ({
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '45%',
            background: `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.65)} 0%, ${alpha(
              theme.palette.common.black,
              0.25,
            )} 60%, transparent 100%)`,
          }),
        }}
      >
        <Box
          component="img"
          src={
            media?.featuredImageUrl ||
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80'
          }
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
        {event.organization && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 2,
            }}
          >
            <Button
              component={Link}
              href={ROUTES.ORGANIZATIONS.ORG(event.organization.slug)}
              variant="contained"
              size="small"
              startIcon={<Business />}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600,
                bgcolor: 'background.paper',
                color: 'text.primary',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                },
              }}
            >
              {event.organization.name}
            </Button>
          </Box>
        )}
      </Box>

      {/* Main Content */}
      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: -4.5, md: -5.5 },
          mb: 8,
          position: 'relative',
          zIndex: 1,
          px: { xs: 0.5, sm: 1.5, md: 2 },
        }}
      >
        <Grid container spacing={4}>
          {/* Left Column */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Title & Actions */}
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
              <CardContent sx={{ p: contentPadding }}>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.5rem', sm: '1.875rem', md: '2.25rem' },
                    lineHeight: 1.2,
                    m: 2,
                  }}
                >
                  {title}
                </Typography>
                <EventDetailActions
                  eventId={eventId}
                  eventUrl={eventUrl}
                  isSavedByMe={isSavedByMe ?? false}
                  myRsvpStatus={myRsvp?.status ?? null}
                />
              </CardContent>
            </Card>

            {/* About */}
            <Card elevation={0} sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: contentPadding }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                  About This Event
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ lineHeight: 1.8, fontSize: '1.05rem', whiteSpace: 'pre-line' }}
                >
                  {description}
                </Typography>
              </CardContent>
            </Card>

            {/* Organizers */}
            <Card elevation={0} sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: contentPadding }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                  Organized By
                </Typography>
                {organizerData.length === 0 ? (
                  <Typography color="text.secondary">No organizers listed.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {organizerData
                      .filter((organizer) => organizer.user)
                      .map((organizer) => {
                        const user = organizer.user!;
                        const displayName =
                          user.given_name && user.family_name
                            ? `${user.given_name} ${user.family_name}`
                            : user.username || 'Unknown User';
                        return (
                          <UserPreviewItem
                            key={user.userId}
                            paperProps={previewPaperProps}
                            name={displayName}
                            username={user.username}
                            avatarUrl={user.profile_picture || undefined}
                            chipLabel={organizer.role}
                            chipColor="secondary"
                            chipVariant="filled"
                          />
                        );
                      })}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Participants */}
            <Card elevation={0} sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: contentPadding }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight={700}>
                    Who&apos;s Attending
                  </Typography>
                  {participantList.length > 0 && (
                    <Chip
                      label={participantList.length}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700, minWidth: 32 }}
                    />
                  )}
                </Stack>

                {participantList.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Groups sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">Be the first to RSVP!</Typography>
                  </Box>
                ) : (
                  <>
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      {attendeePreview
                        .filter(
                          (
                            participant,
                          ): participant is EventParticipant & {
                            user: NonNullable<EventParticipant['user']>;
                          } => Boolean(participant.user),
                        )
                        .map((participant) => {
                          const isVisible = canViewAttendee(participant.user);
                          const visibilityLabel = getVisibilityLabel(participant.user.defaultVisibility);
                          return (
                            <UserPreviewItem
                              key={participant.participantId}
                              paperProps={previewPaperProps}
                              name={getParticipantDisplayName(participant)}
                              username={participant.user.username}
                              avatarUrl={participant.user.profile_picture || undefined}
                              chipLabel={getParticipantStatusLabel(participant)}
                              chipColor={getParticipantChipColor(participant.status)}
                              chipVariant="outlined"
                              masked={!isVisible}
                              maskLabel={isVisible ? undefined : `${visibilityLabel} • Follow to view`}
                            />
                          );
                        })}
                    </Stack>
                    {participantList.length > attendeePreview.length && (
                      <Button component={Link} href={attendeeRoute} variant="text" sx={{ fontWeight: 600 }}>
                        View all {participantList.length} attendees
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: contentPadding }}>
                  <Stack spacing={2.5}>
                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
                        <CalendarMonth sx={{ fontSize: 24, color: 'primary.main', mt: 0.5 }} />
                        <Box>
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ letterSpacing: 1 }}
                          >
                            Date & Time
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                            {formatRecurrenceRule(recurrenceRule)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider />

                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <LocationOn sx={{ fontSize: 24, color: 'primary.main', mt: 0.5 }} />
                        <Box>
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ letterSpacing: 1 }}
                          >
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
                            {location.locationType !== 'online' && formatLocationText(location)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider />

                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <ConfirmationNumber sx={{ fontSize: 24, color: 'primary.main', mt: 0.5 }} />
                        <Box>
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ letterSpacing: 1 }}
                          >
                            Admission
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                            Free
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider />

                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Groups sx={{ fontSize: 24, color: 'primary.main', mt: 0.5 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ letterSpacing: 1 }}
                          >
                            Attendance
                          </Typography>
                          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            {goingCount > 0 && (
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Going
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="primary.main">
                                  {goingCount}
                                </Typography>
                              </Stack>
                            )}
                            {interestedCount > 0 && (
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Interested
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="info.main">
                                  {interestedCount}
                                </Typography>
                              </Stack>
                            )}
                            {waitlistedCount > 0 && (
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Waitlisted
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="warning.main">
                                  {waitlistedCount}
                                </Typography>
                              </Stack>
                            )}
                            {participantList.length === 0 && (
                              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                No RSVPs yet
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {location.locationType === 'venue' && <EventLocationMap location={location} />}

              {eventCategories.length > 0 && (
                <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: contentPadding }}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      fontWeight={600}
                      sx={{ letterSpacing: 1, mb: 2, display: 'block' }}
                    >
                      Categories
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {eventCategories.map((category, index) => (
                        <EventCategoryBadge key={`${category.name}.${index}`} category={category} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <Card
                elevation={0}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
              >
                <CardContent sx={{ p: contentPadding, textAlign: 'center' }}>
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
