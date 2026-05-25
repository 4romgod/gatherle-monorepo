'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Theme,
  Typography,
} from '@mui/material';
import {
  CalendarTodayOutlined,
  CalendarMonth,
  LocationOn,
  PlaceOutlined,
  MapOutlined,
  ConfirmationNumber,
  Groups,
  GroupsOutlined,
  Language,
  Business,
  OpenInNew,
  OpenInNewOutlined,
} from '@mui/icons-material';
import {
  FollowApprovalStatus,
  FollowTargetType,
  GetEventBySlugDocument,
  GetEventOccurrencesDocument,
  ParticipantStatus,
} from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import EventCategoryBadge from '@/components/categories/CategoryBadge';
import EventDetailSkeleton from '@/components/events/EventDetailSkeleton';
import EventLocationMap from '@/components/events/EventLocationMap';
import EventImageLightbox from '@/components/events/EventImageLightbox';
import { EventShareButton, RsvpButton, SaveEventButton } from '@/components/events';
import { formatLocationText, getLocationNavigationUrl } from '@/components/events/location-utils';
import {
  EventParticipantRecord,
  EventSeriesParticipantRecord,
  EventOccurrenceParticipantRecord,
  canViewerSeeParticipant,
  getParticipantChipColor,
  getParticipantDisplayName,
  getParticipantStatusLabel,
  getVisibilityLabel,
} from '@/components/events/participant-utils';
import {
  formatOccurrenceChipLabel,
  formatOccurrenceDateTime,
  formatRecurrenceRule,
} from '@/components/events/date-utils';
import {
  buildEventOccurrenceHref,
  getOccurrenceAnchor,
  getRequestedOccurrenceAnchor,
} from '@/components/events/occurrence-url';
import UserPreviewItem from '@/components/users/UserPreviewItem';
import { useFollowing } from '@/hooks/useFollow';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import ErrorPage from '@/components/errors/ErrorPage';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';
import { IMPORTED_EVENT_SYSTEM_USERNAME } from '@/lib/constants/general';
import EventOperationsModal from '@/components/core/modal/EventOperationsModal';
import EventMomentsRing from '@/components/eventMoments/EventMomentsRing';
import EventMomentViewer from '@/components/eventMoments/EventMomentViewer';
import EventMomentComposer from '@/components/eventMoments/EventMomentComposer';
import type { GetEventBySlugQuery, GetEventMomentsQuery } from '@/data/graphql/types/graphql';

interface EventDetailPageClientProps {
  slug: string;
}

function normalizeExternalUrl(url?: string | null) {
  const normalizedUrl = url?.trim();

  if (!normalizedUrl) {
    return null;
  }

  return /^https?:\/\//i.test(normalizedUrl) ? normalizedUrl : `https://${normalizedUrl}`;
}

function formatCalendarDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function formatCalendarDateInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    second: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

  return `${getPart('year')}${getPart('month')}${getPart('day')}T${getPart('hour')}${getPart('minute')}${getPart('second')}`;
}

function buildGoogleCalendarUrl({
  description,
  endAt,
  locationText,
  startAt,
  timeZone,
  title,
  webUrl,
}: {
  description: string;
  endAt?: string | null;
  locationText: string;
  startAt?: string | null;
  timeZone?: string | null;
  title: string;
  webUrl: string;
}) {
  if (!startAt) {
    return null;
  }

  const startDate = new Date(startAt);
  const endDate = endAt ? new Date(endAt) : new Date(startDate.getTime() + 60 * 60 * 1000);
  const details = encodeURIComponent(`${description}\n\n${webUrl}`.trim());
  const encodedTitle = encodeURIComponent(title);
  const encodedLocation = encodeURIComponent(locationText);
  const trimmedTimeZone = timeZone?.trim();
  const dates = trimmedTimeZone
    ? `${formatCalendarDateInTimeZone(startDate, trimmedTimeZone)}/${formatCalendarDateInTimeZone(endDate, trimmedTimeZone)}`
    : `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`;
  const ctz = trimmedTimeZone ? `&ctz=${encodeURIComponent(trimmedTimeZone)}` : '';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${dates}&details=${details}&location=${encodedLocation}${ctz}`;
}

function formatMobileScheduleValue(
  startAt?: string | Date | null,
  endAt?: string | Date | null,
  timezone?: string | null,
) {
  if (!startAt) {
    return 'Date to be announced';
  }

  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: timezone ?? undefined,
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone ?? undefined,
  });

  const dateLabel = dateFormatter.format(start);
  const startLabel = timeFormatter.format(start);
  const endLabel = end ? timeFormatter.format(end) : null;

  return `${dateLabel}\n${startLabel}${endLabel ? ` - ${endLabel}` : ''}`;
}

function formatMobileLocationValue(location: NonNullable<GetEventBySlugQuery['readEventBySlug']>['location']) {
  if (location.locationType === 'online') {
    return 'Online event';
  }

  const parts = [location.address?.city, location.address?.state, location.address?.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Location to be announced';
}

function formatMobileCountLabel(count: number, singular: string, plural?: string) {
  const pluralLabel = plural ?? `${singular}s`;
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

export default function EventDetailPageClient({ slug }: EventDetailPageClientProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const token = session?.user?.token;
  const occurrencesFromDate = useMemo(() => new Date().toISOString(), []);
  const requestedOccurrenceAnchor = getRequestedOccurrenceAnchor(searchParams);
  const legacyRequestedOccurrenceId = searchParams.get('occurrence');
  const { data, loading, error } = useQuery(GetEventBySlugDocument, {
    variables: { slug, occurrencesFromDate },
    context: {
      headers: getAuthHeader(token),
    },
    fetchPolicy: 'cache-and-network',
  });
  const event = data?.readEventBySlug;
  const { data: requestedOccurrenceData, loading: requestedOccurrenceLoading } = useQuery(GetEventOccurrencesDocument, {
    skip: !event?.eventId || !requestedOccurrenceAnchor,
    variables: {
      options: {
        filters: [{ field: 'eventSeriesId', value: [event?.eventId ?? ''] }],
        dateRange: {
          startDate: requestedOccurrenceAnchor ?? '',
          endDate: requestedOccurrenceAnchor ?? '',
        },
        pagination: { limit: 1, skip: 0 },
      },
    },
    context: {
      headers: getAuthHeader(token),
    },
    fetchPolicy: 'cache-and-network',
  });
  const upcomingOccurrences = event?.upcomingOccurrences ?? [];
  const requestedOccurrence = requestedOccurrenceData?.readEventOccurrences?.[0] ?? null;
  const hasExplicitOccurrenceSelection = Boolean(requestedOccurrenceAnchor || legacyRequestedOccurrenceId);
  const selectedOccurrence = useMemo(() => {
    if (!upcomingOccurrences.length && !requestedOccurrence) {
      return null;
    }

    if (requestedOccurrenceAnchor) {
      return (
        upcomingOccurrences.find((occurrence) => getOccurrenceAnchor(occurrence) === requestedOccurrenceAnchor) ??
        requestedOccurrence ??
        null
      );
    }

    if (legacyRequestedOccurrenceId) {
      return (
        upcomingOccurrences.find((occurrence) => occurrence.occurrenceId === legacyRequestedOccurrenceId) ??
        requestedOccurrence ??
        null
      );
    }

    return upcomingOccurrences[0] ?? requestedOccurrence ?? null;
  }, [legacyRequestedOccurrenceId, requestedOccurrence, requestedOccurrenceAnchor, upcomingOccurrences]);
  const fallbackParticipantList = (event?.participants ?? []) as EventSeriesParticipantRecord[];
  const occurrenceParticipantList = (selectedOccurrence?.participants ?? []) as EventOccurrenceParticipantRecord[];
  const useOccurrenceParticipantList = Boolean(
    selectedOccurrence &&
    (hasExplicitOccurrenceSelection || occurrenceParticipantList.length > 0 || fallbackParticipantList.length === 0),
  );
  const participantList: EventParticipantRecord[] = useOccurrenceParticipantList
    ? occurrenceParticipantList
    : fallbackParticipantList;
  const activeOccurrenceId = selectedOccurrence?.occurrenceId ?? null;
  const attendeeRoute = buildEventOccurrenceHref(
    ROUTES.EVENTS.ATTENDEES(slug),
    useOccurrenceParticipantList ? selectedOccurrence : null,
  );

  const goingCount = participantList.filter(
    (p) => p.status === ParticipantStatus.Going || p.status === ParticipantStatus.CheckedIn,
  ).length;
  const interestedCount = participantList.filter((p) => p.status === ParticipantStatus.Interested).length;
  const waitlistedCount = participantList.filter((p) => p.status === ParticipantStatus.Waitlisted).length;
  const activeParticipantCount = participantList.filter((p) => p.status !== ParticipantStatus.Cancelled).length;

  const eventUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return buildEventOccurrenceHref(`/events/${slug}`, selectedOccurrence);
    }
    const baseUrl = `${window.location.origin}/events/${slug}`;
    return buildEventOccurrenceHref(baseUrl, selectedOccurrence);
  }, [selectedOccurrence, slug]);

  const attendeePreview = participantList.slice(0, 3);
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
  const { following } = useFollowing();
  const viewerUserId = session?.user?.userId;
  const isAdmin = useIsAdmin();
  const isOrganizer = useMemo(
    () => (event?.organizers ?? []).some((o) => o.user?.userId === viewerUserId),
    [event?.organizers, viewerUserId],
  );
  const canEditEvent = isOrganizer || isAdmin;
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
  const canViewAttendee = (user?: EventParticipantRecord['user']) =>
    canViewerSeeParticipant(user, viewerUserId, followingUserIds);

  const notFoundError = isNotFoundGraphQLError(error);
  const isLoading = loading || (!event && !error);

  // Event Moments UI state
  type Moment = GetEventMomentsQuery['readEventMoments']['items'][number];
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerMoments, setViewerMoments] = useState<Moment[]>([]);
  const [viewerMomentGroups, setViewerMomentGroups] = useState<Moment[][]>([]);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const derivedCurrentRsvpStatus =
    selectedOccurrence &&
    (hasExplicitOccurrenceSelection || selectedOccurrence.myRsvp?.status != null || !event?.myRsvp)
      ? (selectedOccurrence.myRsvp?.status ?? null)
      : (event?.myRsvp?.status ?? null);
  const [mobileRsvpStatus, setMobileRsvpStatus] = useState<ParticipantStatus | null>(derivedCurrentRsvpStatus);
  const [mobileSavedState, setMobileSavedState] = useState(event?.isSavedByMe ?? false);

  const openViewer = (groups: Moment[][], groupIndex: number) => {
    setViewerMomentGroups(groups);
    setViewerGroupIndex(groupIndex);
    setViewerMoments(groups[groupIndex] ?? []);
    setViewerIndex(0);
    setViewerOpen(true);
  };

  useEffect(() => {
    setMobileRsvpStatus(derivedCurrentRsvpStatus);
  }, [derivedCurrentRsvpStatus]);

  useEffect(() => {
    setMobileSavedState(event?.isSavedByMe ?? false);
  }, [event?.isSavedByMe]);

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
    location,
    eventCategories,
    eventId,
    isSavedByMe,
    myRsvp,
  } = event;
  const recurrenceRule = event.primarySchedule.recurrenceRule;
  const scheduleFallbackEndAt =
    event.primarySchedule.anchorStartAt && (event.primarySchedule.occurrenceDurationMinutes ?? 0) > 0
      ? new Date(
          new Date(event.primarySchedule.anchorStartAt).getTime() +
            event.primarySchedule.occurrenceDurationMinutes * 60 * 1000,
        ).toISOString()
      : null;
  const currentRsvpStatus =
    selectedOccurrence && (hasExplicitOccurrenceSelection || selectedOccurrence.myRsvp?.status != null || !myRsvp)
      ? (selectedOccurrence.myRsvp?.status ?? null)
      : (myRsvp?.status ?? null);
  const selectedOccurrenceDateLabel = formatOccurrenceDateTime(
    selectedOccurrence?.startAt,
    selectedOccurrence?.endAt,
    selectedOccurrence?.timezone,
  );
  const requestedOccurrenceMissing = Boolean(
    (requestedOccurrenceAnchor || legacyRequestedOccurrenceId) && !requestedOccurrenceLoading && !selectedOccurrence,
  );

  const organizerIds = (event?.organizers ?? []).filter((o) => o.user?.userId).map((o) => o.user!.userId);
  const hasImportedSystemOrganizer = organizerData.some(
    (organizer) => organizer.user?.username === IMPORTED_EVENT_SYSTEM_USERNAME,
  );
  const visibleOrganizers =
    event.organization && hasImportedSystemOrganizer
      ? organizerData.filter((organizer) => organizer.user?.username !== IMPORTED_EVENT_SYSTEM_USERNAME)
      : organizerData;
  const primaryOrganizer = visibleOrganizers.find((organizer) => organizer.user)?.user ?? null;
  const featuredImageUrl =
    media?.featuredImageUrl ||
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80';
  const directionsUrl = location.locationType === 'online' ? null : getLocationNavigationUrl(location);
  const eventSourceUrl = normalizeExternalUrl(event.eventLink);
  const calendarUrl = buildGoogleCalendarUrl({
    description: description || '',
    endAt: selectedOccurrence?.endAt ?? scheduleFallbackEndAt,
    locationText: location.locationType === 'online' ? 'Online event' : formatLocationText(location),
    startAt: selectedOccurrence?.startAt ?? event.primarySchedule.anchorStartAt,
    timeZone: selectedOccurrence?.timezone ?? event.primarySchedule.timezone,
    title,
    webUrl: eventUrl,
  });
  const utilityActionButtonSx = {
    minHeight: { xs: 52, md: 48 },
    borderRadius: '14px',
    borderWidth: 2,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    color: 'text.primary',
    textTransform: 'none',
    fontWeight: 700,
    width: '100%',
    justifyContent: 'center',
    textAlign: 'center',
    '& .MuiButton-startIcon, & .MuiButton-endIcon': {
      color: 'text.primary',
      marginLeft: 0,
      marginRight: 1,
    },
    '&:hover': {
      borderColor: 'divider',
      bgcolor: 'action.hover',
    },
  } as const;
  const xsScheduleValue = formatMobileScheduleValue(
    selectedOccurrence?.startAt ?? event.primarySchedule.anchorStartAt,
    selectedOccurrence?.endAt ?? scheduleFallbackEndAt,
    selectedOccurrence?.timezone ?? event.primarySchedule.timezone,
  );
  const xsLocationValue = formatMobileLocationValue(location);
  const xsAttendanceValue = formatMobileCountLabel(activeParticipantCount, 'guest');
  const xsDetailCardSx = {
    bgcolor: 'action.hover',
    borderRadius: '18px',
    p: 2,
    minHeight: 110,
    flexBasis: '48%',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  } as const;
  const xsDetailLabelSx = {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'text.secondary',
  } as const;
  const xsDetailValueSx = {
    fontSize: '0.8rem',
    fontWeight: 600,
    lineHeight: 1.45,
    whiteSpace: 'pre-line',
    color: 'text.primary',
  } as const;
  const xsSectionTitleSx = {
    fontWeight: 700,
    mb: 1.25,
    fontSize: '17px',
    lineHeight: '22px',
    letterSpacing: '-0.04em',
  } as const;
  const xsBodyCopySx = {
    fontSize: '15px',
    lineHeight: '24px',
    color: 'text.secondary',
    whiteSpace: 'pre-line',
  } as const;
  const xsHostCardSx = {
    textDecoration: 'none',
    color: 'inherit',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '18px',
    bgcolor: 'action.hover',
    p: 2,
  } as const;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 18, md: 22 } }}>
      <Container
        maxWidth="lg"
        sx={{
          pt: { xs: 2, md: 3 },
          px: { xs: 1.5, sm: 2, md: 3 },
        }}
      >
        <Stack spacing={{ xs: 2, md: 2.5 }}>
          <Box
            component="button"
            onClick={() => setImageViewerOpen(true)}
            sx={{
              aspectRatio: '16 / 9',
              width: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: { xs: 1.5, md: 1.5 },
              overflow: 'hidden',
              backgroundColor: 'grey.950',
              p: 0,
              display: 'block',
              cursor: 'zoom-in',
            }}
          >
            <Box
              component="img"
              src={featuredImageUrl}
              alt={title}
              sx={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>

          <Stack spacing={1.5} sx={{ px: { xs: 0.5, md: 0 } }}>
            {goingCount > 0 && (
              <Chip
                label={`${goingCount} going${interestedCount > 0 ? ` · ${interestedCount} interested` : ''}`}
                color="primary"
                variant="outlined"
                sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
              />
            )}

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '1.5rem', md: '2.5rem' },
                    lineHeight: 1.08,
                    letterSpacing: -1,
                  }}
                >
                  {title}
                </Typography>
              </Box>

              {event.organization && (
                <Button
                  component={Link}
                  href={ROUTES.ORGANIZATIONS.ORG(event.organization.slug)}
                  startIcon={<Business />}
                  sx={{
                    alignSelf: { xs: 'flex-start', md: 'center' },
                    display: { xs: 'none', md: 'inline-flex' },
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 2,
                    py: 1,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'background.paper' },
                  }}
                >
                  {event.organization.name}
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>

      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 2, md: 3 },
          mb: 8,
          position: 'relative',
          zIndex: 1,
          px: { xs: 1.5, sm: 2, md: 3 },
        }}
      >
        <Grid container spacing={4}>
          {/* Left Column */}
          <Grid size={{ xs: 12, md: 8 }}>
            {requestedOccurrenceMissing && (
              <Box sx={{ mb: 2, px: { xs: 1, md: 0 } }}>
                <Alert severity="warning">
                  That session is no longer available. Showing the next active occurrence for this series instead.
                </Alert>
              </Box>
            )}

            {/* Actions */}
            <Box sx={{ mb: { xs: 2, md: 4 }, px: { xs: 1, md: 0 } }}>
              <Stack spacing={1.25}>
                {canEditEvent ? (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <EventOperationsModal event={event} redirectOnDelete={ROUTES.EVENTS.ROOT} />
                  </Box>
                ) : null}

                <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, width: '100%' }}>
                  <Stack direction="row" spacing={1.25}>
                    {directionsUrl ? (
                      <Button
                        component="a"
                        href={directionsUrl}
                        rel="noreferrer"
                        target="_blank"
                        startIcon={<MapOutlined />}
                        variant="outlined"
                        sx={{
                          ...utilityActionButtonSx,
                          flex: 1,
                        }}
                      >
                        Directions
                      </Button>
                    ) : null}
                    {calendarUrl ? (
                      <Button
                        component="a"
                        href={calendarUrl}
                        rel="noreferrer"
                        target="_blank"
                        startIcon={<CalendarTodayOutlined />}
                        variant="outlined"
                        sx={{ ...utilityActionButtonSx, flex: 1 }}
                      >
                        Add to calendar
                      </Button>
                    ) : null}
                  </Stack>

                  {eventSourceUrl ? (
                    <Button
                      component="a"
                      fullWidth
                      href={eventSourceUrl}
                      rel="noreferrer"
                      target="_blank"
                      startIcon={<OpenInNewOutlined />}
                      variant="outlined"
                      sx={utilityActionButtonSx}
                    >
                      View event source
                    </Button>
                  ) : null}
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  sx={{ display: { xs: 'none', md: 'flex' } }}
                >
                  {directionsUrl ? (
                    <Button
                      component="a"
                      href={directionsUrl}
                      rel="noreferrer"
                      target="_blank"
                      startIcon={<LocationOn />}
                      variant="outlined"
                      sx={{ ...utilityActionButtonSx, flex: 1 }}
                    >
                      Directions
                    </Button>
                  ) : null}
                  {calendarUrl ? (
                    <Button
                      component="a"
                      href={calendarUrl}
                      rel="noreferrer"
                      target="_blank"
                      startIcon={<CalendarMonth />}
                      variant="outlined"
                      sx={{ ...utilityActionButtonSx, flex: 1 }}
                    >
                      Add to calendar
                    </Button>
                  ) : null}
                </Stack>

                {eventSourceUrl ? (
                  <Button
                    component="a"
                    href={eventSourceUrl}
                    rel="noreferrer"
                    target="_blank"
                    startIcon={<OpenInNew />}
                    variant="outlined"
                    sx={{ ...utilityActionButtonSx, display: { xs: 'none', md: 'inline-flex' } }}
                  >
                    View event source
                  </Button>
                ) : null}
              </Stack>
            </Box>

            {/* Event Moments */}
            <Box sx={{ mb: 4, px: { xs: 1, md: 0 } }}>
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: xsSectionTitleSx.fontSize, md: undefined },
                  lineHeight: { xs: xsSectionTitleSx.lineHeight, md: undefined },
                  letterSpacing: { xs: xsSectionTitleSx.letterSpacing, md: undefined },
                }}
              >
                Moments
              </Typography>
              <EventMomentsRing
                eventId={eventId}
                myRsvpStatus={currentRsvpStatus}
                eventEndAt={selectedOccurrence?.endAt ?? scheduleFallbackEndAt}
                onAddClick={() => setComposerOpen(true)}
                onMomentClick={openViewer}
              />
            </Box>

            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4, px: 1 }}>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                <Paper elevation={0} sx={xsDetailCardSx}>
                  <CalendarTodayOutlined sx={{ fontSize: 22, color: 'primary.main' }} />
                  <Typography sx={xsDetailLabelSx}>Schedule</Typography>
                  <Typography sx={xsDetailValueSx}>{xsScheduleValue}</Typography>
                </Paper>
                <Paper elevation={0} sx={xsDetailCardSx}>
                  <PlaceOutlined sx={{ fontSize: 22, color: 'primary.main' }} />
                  <Typography sx={xsDetailLabelSx}>Location</Typography>
                  <Typography sx={xsDetailValueSx}>{xsLocationValue}</Typography>
                </Paper>
                <Paper elevation={0} sx={xsDetailCardSx}>
                  <GroupsOutlined sx={{ fontSize: 22, color: 'primary.main' }} />
                  <Typography sx={xsDetailLabelSx}>Attendance</Typography>
                  <Typography sx={xsDetailValueSx}>{xsAttendanceValue}</Typography>
                </Paper>
              </Stack>
            </Box>

            {/* About */}
            <Box sx={{ mb: 4, px: { xs: 1, md: 0 } }}>
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: xsSectionTitleSx.fontSize, md: undefined },
                  lineHeight: { xs: xsSectionTitleSx.lineHeight, md: undefined },
                  letterSpacing: { xs: xsSectionTitleSx.letterSpacing, md: undefined },
                }}
              >
                About this event
              </Typography>
              <Typography variant="subtitle2" sx={xsBodyCopySx}>
                {description}
              </Typography>
            </Box>

            {eventCategories.length > 0 && (
              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4, px: 1 }}>
                <Typography variant="h6" component="h2" sx={xsSectionTitleSx}>
                  Categories
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {eventCategories.map((category, index) => (
                    <EventCategoryBadge key={`${category.name}.${index}`} category={category} />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Organizers */}
            <Box sx={{ mb: 4, px: { xs: 1, md: 0 } }}>
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: xsSectionTitleSx.fontSize, md: undefined },
                  lineHeight: { xs: xsSectionTitleSx.lineHeight, md: undefined },
                  letterSpacing: { xs: xsSectionTitleSx.letterSpacing, md: undefined },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                  Hosted by
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                  Organized By
                </Box>
              </Typography>
              {!event.organization && visibleOrganizers.length === 0 ? (
                <Typography color="text.secondary">No organizers listed.</Typography>
              ) : (
                <Stack spacing={2}>
                  {event.organization && hasImportedSystemOrganizer && (
                    <>
                      <Paper
                        component={Link}
                        href={ROUTES.ORGANIZATIONS.ORG(event.organization.slug)}
                        elevation={0}
                        sx={{
                          display: { xs: 'block', md: 'none' },
                          ...xsHostCardSx,
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            src={event.organization.logo || undefined}
                            alt={event.organization.name}
                            variant="rounded"
                            sx={{ width: 48, height: 48, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}
                          >
                            <Business fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {event.organization.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Organizer
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                      <Paper
                        component={Link}
                        href={ROUTES.ORGANIZATIONS.ORG(event.organization.slug)}
                        elevation={0}
                        sx={(theme) => ({
                          ...previewPaperSx(theme),
                          display: { xs: 'none', md: 'block' },
                          textDecoration: 'none',
                          color: 'inherit',
                        })}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            src={event.organization.logo || undefined}
                            alt={event.organization.name}
                            variant="rounded"
                            sx={{ width: 52, height: 52, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}
                          >
                            <Business fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {event.organization.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Organization
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </>
                  )}
                  {visibleOrganizers
                    .filter((organizer) => organizer.user)
                    .map((organizer) => {
                      const user = organizer.user!;
                      const displayName =
                        user.given_name && user.family_name
                          ? `${user.given_name} ${user.family_name}`
                          : user.username || 'Unknown User';

                      return (
                        <Box key={user.userId}>
                          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                            <UserPreviewItem
                              paperProps={previewPaperProps}
                              name={displayName}
                              username={user.username}
                              avatarUrl={user.profile_picture || undefined}
                              chipLabel={organizer.role}
                              chipColor="secondary"
                              chipVariant="filled"
                            />
                          </Box>
                          <Paper
                            component={Link}
                            href={ROUTES.USERS.USER(user.username ?? '')}
                            elevation={0}
                            sx={{
                              display: { xs: user.username ? 'block' : 'none', md: 'none' },
                              ...xsHostCardSx,
                            }}
                          >
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar src={user.profile_picture || undefined} sx={{ width: 48, height: 48 }}>
                                {(displayName || user.username || '?').charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {displayName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Event host
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Box>
                      );
                    })}
                </Stack>
              )}
            </Box>

            {/* Participants */}
            <Box
              sx={{
                mb: 4,
                px: { xs: 1, md: 0 },
                display: participantList.length === 0 ? { xs: 'none', md: 'block' } : 'block',
              }}
            >
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: xsSectionTitleSx.fontSize, md: undefined },
                  lineHeight: { xs: xsSectionTitleSx.lineHeight, md: undefined },
                  letterSpacing: { xs: xsSectionTitleSx.letterSpacing, md: undefined },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                  People going
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                  Who&apos;s Attending
                </Box>
                {participantList.length > 0 && (
                  <Chip
                    label={participantList.length}
                    size="small"
                    color="primary"
                    sx={{
                      display: { xs: 'none', md: 'inline-flex' },
                      fontWeight: 700,
                      minWidth: 32,
                      ml: 1,
                      verticalAlign: 'middle',
                    }}
                  />
                )}
              </Typography>

              {participantList.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Groups
                    sx={{ display: { xs: 'none', md: 'inline-flex' }, fontSize: 48, color: 'text.secondary', mb: 1 }}
                  />
                  <Typography sx={{ display: { xs: 'none', md: 'block' }, color: 'text.secondary' }}>
                    Be the first to RSVP!
                  </Typography>
                </Box>
              ) : (
                <>
                  <Stack
                    direction="row"
                    spacing={0}
                    alignItems="center"
                    sx={{ display: { xs: 'flex', md: 'none' }, mb: 1 }}
                  >
                    {attendeePreview
                      .filter(
                        (
                          participant,
                        ): participant is EventParticipantRecord & {
                          user: NonNullable<EventParticipantRecord['user']>;
                        } => Boolean(participant.user),
                      )
                      .map((participant, index) => (
                        <Avatar
                          key={participant.participantId}
                          src={participant.user.profile_picture || undefined}
                          sx={{
                            width: 40,
                            height: 40,
                            ml: index === 0 ? 0 : -1.25,
                            border: '2px solid',
                            borderColor: 'background.paper',
                          }}
                        >
                          {getParticipantDisplayName(participant).charAt(0).toUpperCase()}
                        </Avatar>
                      ))}
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1.5 }}>
                      {participantList.length} people
                    </Typography>
                  </Stack>
                  <Stack spacing={2} sx={{ display: { xs: 'none', md: 'flex' }, mb: 3 }}>
                    {attendeePreview
                      .filter(
                        (
                          participant,
                        ): participant is EventParticipantRecord & {
                          user: NonNullable<EventParticipantRecord['user']>;
                        } => Boolean(participant.user),
                      )
                      .map((participant) => {
                        const isVisible = canViewAttendee(participant.user);
                        const visibilityLabel = getVisibilityLabel(participant.user.defaultVisibility);
                        return (
                          <Box key={participant.participantId} sx={{ display: { xs: 'none', md: 'block' } }}>
                            <UserPreviewItem
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
                          </Box>
                        );
                      })}
                  </Stack>
                  {participantList.length > attendeePreview.length && (
                    <Button
                      component={Link}
                      href={attendeeRoute}
                      variant="text"
                      sx={{ display: { xs: 'none', md: 'inline-flex' }, fontWeight: 600 }}
                    >
                      View all {participantList.length} attendees
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
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
                          Date &amp; Time
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                          {selectedOccurrenceDateLabel}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          {formatRecurrenceRule(recurrenceRule)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Divider />

                  {upcomingOccurrences.length > 0 && (
                    <>
                      <Box>
                        <Typography
                          variant="overline"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{ letterSpacing: 1, display: 'block', mb: 1 }}
                        >
                          Upcoming Sessions
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {upcomingOccurrences.slice(0, 6).map((occurrence) => {
                            const isSelected = occurrence.occurrenceId === activeOccurrenceId;
                            return (
                              <Chip
                                key={occurrence.occurrenceId}
                                component={Link}
                                clickable
                                href={buildEventOccurrenceHref(ROUTES.EVENTS.EVENT(slug), occurrence)}
                                label={formatOccurrenceChipLabel(occurrence.startAt, occurrence.timezone)}
                                color={isSelected ? 'primary' : 'default'}
                                variant={isSelected ? 'filled' : 'outlined'}
                              />
                            );
                          })}
                        </Stack>
                      </Box>

                      <Divider />
                    </>
                  )}

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

                  {goingCount > 0 && (
                    <>
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
                    </>
                  )}
                </Stack>
              </Box>

              {location.locationType === 'venue' && <EventLocationMap location={location} />}

              {eventCategories.length > 0 && (
                <Box sx={{ mb: 4, px: { xs: 1, md: 0 } }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
                    Categories
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {eventCategories.map((category, index) => (
                      <EventCategoryBadge key={`${category.name}.${index}`} category={category} />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>

      <EventImageLightbox
        alt={title}
        onClose={() => setImageViewerOpen(false)}
        open={imageViewerOpen}
        src={featuredImageUrl}
      />

      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: { xs: 12, md: 20 },
          zIndex: 1200,
          px: { xs: 1.5, sm: 2, md: 3 },
          pointerEvents: 'none',
        }}
      >
        <Container maxWidth="lg" sx={{ px: '0 !important' }}>
          <Paper
            elevation={0}
            sx={{
              pointerEvents: 'auto',
              width: '100%',
              maxWidth: 480,
              mx: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              px: 0.875,
              py: 0.875,
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.shadows[4],
            }}
          >
            <Stack direction="row" spacing={0.75} sx={{ width: '100%' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <RsvpButton
                  currentStatus={mobileRsvpStatus}
                  eventId={eventId}
                  fullWidth
                  label={
                    mobileRsvpStatus === ParticipantStatus.Going
                      ? 'Going'
                      : mobileRsvpStatus === ParticipantStatus.Interested
                        ? 'Interested'
                        : 'RSVP'
                  }
                  occurrenceId={activeOccurrenceId ?? undefined}
                  onRsvpChange={setMobileRsvpStatus}
                  showTooltip={false}
                  size="medium"
                  sx={{
                    minHeight: 42,
                    borderRadius: 1,
                    px: 1.25,
                    fontSize: '0.85rem',
                    bgcolor:
                      mobileRsvpStatus === ParticipantStatus.Going || mobileRsvpStatus === ParticipantStatus.Interested
                        ? 'success.lighter'
                        : 'secondary.main',
                    borderColor:
                      mobileRsvpStatus === ParticipantStatus.Going || mobileRsvpStatus === ParticipantStatus.Interested
                        ? 'success.main'
                        : 'secondary.main',
                    color:
                      mobileRsvpStatus === ParticipantStatus.Going || mobileRsvpStatus === ParticipantStatus.Interested
                        ? 'success.main'
                        : 'secondary.contrastText',
                    '&:hover': {
                      bgcolor:
                        mobileRsvpStatus === ParticipantStatus.Going ||
                        mobileRsvpStatus === ParticipantStatus.Interested
                          ? 'success.light'
                          : 'secondary.dark',
                      borderColor:
                        mobileRsvpStatus === ParticipantStatus.Going ||
                        mobileRsvpStatus === ParticipantStatus.Interested
                          ? 'success.main'
                          : 'secondary.dark',
                    },
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <SaveEventButton
                  eventId={eventId}
                  fullWidth
                  isSaved={mobileSavedState}
                  label={mobileSavedState ? 'Saved' : 'Save'}
                  onSaveChange={setMobileSavedState}
                  showTooltip={false}
                  size="medium"
                  sx={{
                    minHeight: 42,
                    borderRadius: 1,
                    px: 1.25,
                    fontSize: '0.85rem',
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <EventShareButton
                  eventSlug={slug}
                  eventTitle={title}
                  eventUrl={eventUrl}
                  fullWidth
                  label="Share"
                  size="medium"
                  stopPropagation
                  sx={{
                    minHeight: 42,
                    borderRadius: 1,
                    px: 1.25,
                    fontSize: '0.85rem',
                  }}
                />
              </Box>
            </Stack>
          </Paper>
        </Container>
      </Box>

      {/* Event Moments Viewer */}
      <EventMomentViewer
        moments={viewerMoments}
        startIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onRequestNextGroup={() => {
          if (viewerGroupIndex >= viewerMomentGroups.length - 1) {
            return false;
          }

          const nextIndex = viewerGroupIndex + 1;
          setViewerGroupIndex(nextIndex);
          setViewerMoments(viewerMomentGroups[nextIndex] ?? []);
          setViewerIndex(0);
          return true;
        }}
        onRequestPreviousGroup={() => {
          if (viewerGroupIndex <= 0) {
            return false;
          }

          const nextIndex = viewerGroupIndex - 1;
          setViewerGroupIndex(nextIndex);
          setViewerMoments(viewerMomentGroups[nextIndex] ?? []);
          setViewerIndex(0);
          return true;
        }}
        organizerIds={organizerIds}
        eventContext={{ slug, title }}
        onDeleted={(momentId) => {
          setViewerMoments((prev) => prev.filter((m) => m.momentId !== momentId));
        }}
      />

      {/* Event Moments Composer */}
      <EventMomentComposer
        eventId={eventId}
        occurrenceId={activeOccurrenceId ?? undefined}
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={() => setComposerOpen(false)}
      />
    </Box>
  );
}
