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
  CircularProgress,
  Container,
  Divider,
  Stack,
  Theme,
  Typography,
} from '@mui/material';
import { ArrowBack, CalendarMonth, Groups, LocationOn } from '@mui/icons-material';
import {
  FollowApprovalStatus,
  FollowTargetType,
  GetEventBySlugDocument,
  ParticipantStatus,
} from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import { formatLocationText } from '@/components/events/location-utils';
import { formatRecurrenceRule } from '@/components/events/date-utils';
import {
  EventParticipant,
  getParticipantChipColor,
  getParticipantDisplayName,
  getParticipantStatusLabel,
  canViewerSeeParticipant,
  getVisibilityLabel,
} from '@/components/events/participant-utils';
import UserPreviewItem from '@/components/users/UserPreviewItem';
import { useFollowing } from '@/hooks/useFollow';
import ErrorPage from '@/components/errors/ErrorPage';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';

interface EventAttendeesPageClientProps {
  slug: string;
}

export default function EventAttendeesPageClient({ slug }: EventAttendeesPageClientProps) {
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
  const heroImage = event?.media?.featuredImageUrl;

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
  const canViewParticipant = (user?: EventParticipant['user']) =>
    canViewerSeeParticipant(user, viewerUserId, followingUserIds);

  const goingCount = participantList.filter(
    (participant) =>
      participant.status === ParticipantStatus.Going || participant.status === ParticipantStatus.CheckedIn,
  ).length;
  const interestedCount = participantList.filter(
    (participant) => participant.status === ParticipantStatus.Interested,
  ).length;
  const waitlistedCount = participantList.filter(
    (participant) => participant.status === ParticipantStatus.Waitlisted,
  ).length;

  const notFoundError = isNotFoundGraphQLError(error);

  if (notFoundError) {
    return (
      <ErrorPage
        statusCode={404}
        title="Event not found"
        message="It looks like that event no longer exists or the URL is incorrect."
        ctaLabel="Back to events"
        ctaHref={ROUTES.EVENTS.ROOT}
      />
    );
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
        Unable to load attendees right now.
      </Typography>
    );
  }

  const { title, location, recurrenceRule, description, summary } = event;
  const locationText = location.locationType === 'online' ? 'Online event' : formatLocationText(location);

  const statusSummary = [
    { label: 'Going', count: goingCount, color: 'primary' as const },
    { label: 'Interested', count: interestedCount, color: 'info' as const },
    { label: 'Waitlisted', count: waitlistedCount, color: 'warning' as const },
  ];

  const attendeePaperSx = (theme: Theme) => ({
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
  const attendeePaperProps = {
    elevation: 0,
    sx: attendeePaperSx,
  };

  const participantsWithUser = participantList.filter(
    (participant): participant is EventParticipant & { user: NonNullable<EventParticipant['user']> } =>
      Boolean(participant.user),
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Box
            sx={(theme) => ({
              position: 'relative',
              borderRadius: 3,
              overflow: 'hidden',
              minHeight: { xs: 220, md: 260 },
              backgroundColor: 'grey.900',
              color: 'common.white',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.9)}, ${alpha(
                  theme.palette.common.black,
                  0.45,
                )})`,
              },
            })}
          >
            {heroImage && (
              <Box
                component="img"
                src={heroImage}
                alt={title}
                loading="lazy"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            <Stack
              spacing={2}
              sx={{
                position: 'relative',
                zIndex: 1,
                p: { xs: 3, md: 5 },
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
                <Chip label="RSVP List" color="secondary" variant="filled" size="small" />
                <Button
                  component={Link}
                  href={`/events/${slug}`}
                  startIcon={<ArrowBack />}
                  variant="outlined"
                  sx={{ borderColor: 'common.white', color: 'common.white' }}
                >
                  Back to event
                </Button>
              </Stack>
              <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                {title}
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 620 }}>
                {summary || description || 'See who is joining this experience.'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Typography variant="body2" color="grey.200">
                  <CalendarMonth sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                  {formatRecurrenceRule(recurrenceRule)}
                </Typography>
                <Typography variant="body2" color="grey.200">
                  <LocationOn sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                  {locationText}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Box sx={{ flex: 2 }}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" fontWeight={700}>
                        Attendees ({participantList.length})
                      </Typography>
                      <Chip label="Live" color="success" size="small" />
                    </Stack>

                    <Stack direction="row" flexWrap="wrap" gap={1.5}>
                      {statusSummary.map((status) => (
                        <Chip
                          key={status.label}
                          label={`${status.label}: ${status.count}`}
                          color={status.color}
                          variant="outlined"
                        />
                      ))}
                    </Stack>

                    <Divider />

                    {participantsWithUser.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="body1" color="text.secondary">
                          No one has RSVP’d yet. Share the event to invite friends!
                        </Typography>
                      </Box>
                    ) : (
                      <Stack spacing={2}>
                        {participantsWithUser.map((participant) => {
                          const isVisible = canViewParticipant(participant.user);
                          const visibilityLabel = getVisibilityLabel(participant.user.defaultVisibility);
                          return (
                            <UserPreviewItem
                              key={participant.participantId}
                              paperProps={attendeePaperProps}
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
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Event Snapshot
                  </Typography>

                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CalendarMonth sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatRecurrenceRule(recurrenceRule)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LocationOn sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        {locationText}
                      </Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Groups sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        {participantList.length} total RSVPs
                      </Typography>
                    </Stack>

                    <Divider />

                    <Stack spacing={1}>
                      {statusSummary.map((status) => (
                        <Stack key={status.label} direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            {status.label}
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {status.count}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>

                  <Button
                    component={Link}
                    href={`/events/${slug}`}
                    variant="contained"
                    fullWidth
                    sx={{ mt: 3 }}
                    startIcon={<ArrowBack />}
                  >
                    Back to event page
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
