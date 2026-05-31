'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  BookmarkBorder,
  CalendarToday,
  Delete,
  Edit,
  EventNoteRounded,
  PeopleOutline,
  Save,
} from '@mui/icons-material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AdminEventOccurrencesDialog from '@/components/admin/AdminEventOccurrencesDialog';
import { AdminEventSeriesPreview, AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { EventLifecycleStatus, EventStatus, EventVisibility, SortOrderInput } from '@/data/graphql/types/graphql';
import { GetEventsDocument } from '@/data/graphql/query/Event/query';
import { DeleteEventByIdDocument, UpdateEventDocument } from '@/data/graphql/query/Event/mutation';
import { useAppContext } from '@/hooks/useAppContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
  ADMIN_SURFACE_SX,
  AdminEmptyState,
  AdminListFooter,
  AdminListSearchField,
  AdminSectionHeader,
} from '@/components/admin/admin-ui';
import { formatOccurrenceDateTime, formatRecurrenceRule } from '@/components/events/date-utils';

type EventFormState = {
  status: EventStatus;
  lifecycleStatus: EventLifecycleStatus;
  visibility?: EventVisibility | null;
};

type EventQueue = 'all' | 'drafts' | 'cancelled' | 'upcoming' | 'ongoing';

const STATUS_FIELDS = Object.values(EventStatus);
const LIFECYCLE_FIELDS = Object.values(EventLifecycleStatus);
const VISIBILITY_FIELDS = Object.values(EventVisibility);
const PAGE_SIZE = 12;

function buildEventQueryOptions(searchQuery: string, limit: number, skip = 0, queue: EventQueue = 'all') {
  const trimmedQuery = searchQuery.trim();
  const filters =
    queue === 'drafts'
      ? [{ field: 'lifecycleStatus', value: EventLifecycleStatus.Draft }]
      : queue === 'cancelled'
        ? [{ field: 'status', value: EventStatus.Cancelled }]
        : queue === 'upcoming'
          ? [{ field: 'status', value: EventStatus.Upcoming }]
          : queue === 'ongoing'
            ? [{ field: 'status', value: EventStatus.Ongoing }]
            : undefined;

  return {
    pagination: { limit, skip },
    sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    ...(filters ? { filters } : {}),
    ...(trimmedQuery.length >= 2
      ? {
          search: {
            value: trimmedQuery,
            fields: [
              'title',
              'slug',
              'summary',
              'description',
              'organization.name',
              'location.address.city',
              'location.address.state',
              'location.address.country',
              'eventCategories.name',
            ],
          },
        }
      : {}),
  };
}

function buildEventFormState(event: {
  status?: EventStatus | null;
  lifecycleStatus?: EventLifecycleStatus | null;
  visibility?: EventVisibility | null;
}): EventFormState {
  return {
    status: event.status ?? EventStatus.Upcoming,
    lifecycleStatus: event.lifecycleStatus ?? EventLifecycleStatus.Draft,
    visibility: event.visibility ?? null,
  };
}

export default function AdminEventsSection({ token }: AdminSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeQueue, setActiveQueue] = useState<EventQueue>('all');
  const [selectedEvent, setSelectedEvent] = useState<AdminEventSeriesPreview | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const queryOptions = useMemo(
    () => buildEventQueryOptions(debouncedSearchQuery, PAGE_SIZE, 0, activeQueue),
    [activeQueue, debouncedSearchQuery],
  );
  const { data, loading, error, refetch, fetchMore } = useQuery(GetEventsDocument, {
    variables: {
      options: queryOptions,
    },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  const events = useMemo(() => data?.readEvents ?? [], [data]);
  const editingEvent = editingEventId ? (events.find((event) => event.eventId === editingEventId) ?? null) : null;
  const [eventFormState, setEventFormState] = useState<Record<string, EventFormState>>({});
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{ eventId: string; title: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const [updateEvent] = useMutation(UpdateEventDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteEvent] = useMutation(DeleteEventByIdDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    setEventFormState((prev) => {
      let changed = false;
      const nextState = { ...prev };
      events.forEach((event) => {
        const nextFormState = buildEventFormState(event);
        if (!nextState[event.eventId]) {
          nextState[event.eventId] = nextFormState;
          changed = true;
        }
      });
      return changed ? nextState : prev;
    });
  }, [events]);

  useEffect(() => {
    if (!loading) {
      setHasMore(events.length >= PAGE_SIZE);
    }
  }, [loading, events.length]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const refreshEvents = async () => {
    const requestedLimit = Math.max(events.length, PAGE_SIZE);
    const result = await refetch({
      options: buildEventQueryOptions(debouncedSearchQuery, requestedLimit, 0, activeQueue),
    });
    const refreshedEvents = result.data?.readEvents ?? [];
    setHasMore(refreshedEvents.length >= requestedLimit);
  };

  const openEditDialog = (event: (typeof events)[number]) => {
    setEventFormState((prev) => ({
      ...prev,
      [event.eventId]: buildEventFormState(event),
    }));
    setEditingEventId(event.eventId);
  };

  const handleUpdate = async (eventId: string) => {
    const payload = eventFormState[eventId];
    if (!payload) {
      return false;
    }

    setSavingEventId(eventId);
    try {
      await updateEvent({
        variables: {
          input: {
            eventId,
            status: payload.status,
            lifecycleStatus: payload.lifecycleStatus,
            visibility: payload.visibility ?? undefined,
          },
        },
      });
      await refreshEvents();
      notify('Event status saved.');
      return true;
    } catch {
      notify('Unable to update event.', 'error');
      return false;
    } finally {
      setSavingEventId(null);
    }
  };

  const requestDelete = (event: { eventId: string; title: string }) => {
    setPendingDeleteEvent(event);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteEvent) {
      return;
    }

    setConfirmLoading(true);
    try {
      await deleteEvent({
        variables: { eventId: pendingDeleteEvent.eventId },
      });
      await refreshEvents();
      notify('Event deleted.');
      setPendingDeleteEvent(null);
    } catch {
      notify('Unable to delete event.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || loading || !hasMore) {
      return;
    }

    setLoadingMore(true);
    let nextBatchCount = 0;

    try {
      await fetchMore({
        variables: {
          options: buildEventQueryOptions(debouncedSearchQuery, PAGE_SIZE, events.length, activeQueue),
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const nextItems = fetchMoreResult?.readEvents ?? [];
          nextBatchCount = nextItems.length;

          if (nextItems.length === 0) {
            return previousResult;
          }

          return {
            ...previousResult,
            readEvents: [...(previousResult.readEvents ?? []), ...nextItems],
          };
        },
      });
      setHasMore(nextBatchCount === PAGE_SIZE);
    } catch {
      notify('Unable to load more events.', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const infiniteScrollRef = useInfiniteScroll({
    enabled: hasMore,
    loading: loading || loadingMore,
    onEndReached: () => {
      void handleLoadMore();
    },
  });

  if (error) {
    return <Typography color="error">Failed to load events.</Typography>;
  }

  return (
    <Stack spacing={3}>
      <AdminSectionHeader
        title="Event moderation"
        meta={
          <Chip size="small" label={debouncedSearchQuery ? `${events.length} matches` : `${events.length} loaded`} />
        }
      />

      <AdminListSearchField
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search events by title, slug, location, category, or organization"
        helperText="Type at least 2 characters to search."
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {[
          ['all', 'All'],
          ['drafts', 'Drafts'],
          ['upcoming', 'Upcoming'],
          ['ongoing', 'Ongoing'],
          ['cancelled', 'Cancelled'],
        ].map(([value, label]) => (
          <Chip
            key={value}
            clickable
            color={activeQueue === value ? 'primary' : 'default'}
            label={label}
            onClick={() => setActiveQueue(value as EventQueue)}
            variant={activeQueue === value ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {loading && events.length === 0 ? (
        <Stack spacing={2}>
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} variant="rounded" height={230} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : events.length === 0 ? (
        <AdminEmptyState
          title={debouncedSearchQuery ? 'No matching events' : 'No events yet'}
          description={
            debouncedSearchQuery
              ? 'Try a different event title, slug, summary, or organization name.'
              : 'Once events are created they’ll show up here for moderation and data cleanup.'
          }
        />
      ) : (
        <Stack spacing={2}>
          {events.map((event) => (
            <Card key={event.eventId} elevation={0} sx={ADMIN_SURFACE_SX}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    alignItems={{ xs: 'flex-start', lg: 'center' }}
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {event.title}
                      </Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {event.representativeOccurrence
                            ? formatOccurrenceDateTime(
                                event.representativeOccurrence.startAt,
                                event.representativeOccurrence.endAt,
                                event.representativeOccurrence.timezone,
                              )
                            : formatRecurrenceRule(event.primarySchedule?.recurrenceRule)}
                        </Typography>
                      </Stack>
                      {event.summary ? (
                        <Typography variant="body2" color="text.secondary">
                          {event.summary}
                        </Typography>
                      ) : null}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', lg: 'auto' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EventNoteRounded />}
                        onClick={() =>
                          setSelectedEvent({
                            eventId: event.eventId,
                            title: event.title,
                            summary: event.summary,
                            primarySchedule: event.primarySchedule,
                            representativeOccurrence: event.representativeOccurrence,
                          })
                        }
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Sessions
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => openEditDialog(event)}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Delete />}
                        color="error"
                        onClick={() => requestDelete({ eventId: event.eventId, title: event.title })}
                        disabled={Boolean(pendingDeleteEvent)}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" variant="outlined" label={`Status · ${event.status ?? EventStatus.Upcoming}`} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Lifecycle · ${event.lifecycleStatus ?? EventLifecycleStatus.Draft}`}
                    />
                    {event.visibility ? (
                      <Chip size="small" variant="outlined" label={`Visibility · ${event.visibility}`} />
                    ) : null}
                    <Chip
                      size="small"
                      icon={<PeopleOutline sx={{ fontSize: 14 }} />}
                      label={`${event.representativeOccurrence?.rsvpCount ?? event.rsvpCount ?? 0} RSVPs`}
                    />
                    <Chip
                      size="small"
                      icon={<BookmarkBorder sx={{ fontSize: 14 }} />}
                      label={`${event.savedByCount ?? 0} saves`}
                    />
                    {event.representativeOccurrence ? (
                      <Chip
                        size="small"
                        color="secondary"
                        variant="outlined"
                        label={`Next session · ${formatOccurrenceDateTime(
                          event.representativeOccurrence.startAt,
                          event.representativeOccurrence.endAt,
                          event.representativeOccurrence.timezone,
                        )}`}
                      />
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}

          <AdminListFooter
            label="event"
            loadedCount={events.length}
            hasMore={hasMore}
            loadingMore={loadingMore}
            sentinelRef={infiniteScrollRef}
          />
        </Stack>
      )}

      <Dialog
        open={Boolean(editingEventId)}
        onClose={() => setEditingEventId(null)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        slotProps={{ paper: { sx: { borderRadius: { xs: 0, md: 2 } } } }}
      >
        <DialogTitle
          sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Stack spacing={0.6}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.12em' }}>
                Edit event
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                {editingEvent?.title ?? 'Event'}
              </Typography>
            </Stack>
            <IconButton onClick={() => setEditingEventId(null)} aria-label="Close edit event">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          {editingEventId ? (
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={eventFormState[editingEventId]?.status ?? EventStatus.Upcoming}
                  onChange={(eventChange) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      [editingEventId]: {
                        ...(prev[editingEventId] ?? buildEventFormState(editingEvent ?? {})),
                        status: eventChange.target.value as EventStatus,
                      },
                    }))
                  }
                >
                  {STATUS_FIELDS.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Lifecycle</InputLabel>
                <Select
                  label="Lifecycle"
                  value={eventFormState[editingEventId]?.lifecycleStatus ?? EventLifecycleStatus.Draft}
                  onChange={(eventChange) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      [editingEventId]: {
                        ...(prev[editingEventId] ?? buildEventFormState(editingEvent ?? {})),
                        lifecycleStatus: eventChange.target.value as EventLifecycleStatus,
                      },
                    }))
                  }
                >
                  {LIFECYCLE_FIELDS.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Visibility</InputLabel>
                <Select
                  label="Visibility"
                  value={eventFormState[editingEventId]?.visibility ?? ''}
                  onChange={(eventChange) => {
                    const nextValue = eventChange.target.value;
                    setEventFormState((prev) => ({
                      ...prev,
                      [editingEventId]: {
                        ...(prev[editingEventId] ?? buildEventFormState(editingEvent ?? {})),
                        visibility: nextValue ? (nextValue as EventVisibility) : undefined,
                      },
                    }));
                  }}
                >
                  <MenuItem value="">
                    <em>Unset</em>
                  </MenuItem>
                  {VISIBILITY_FIELDS.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={() => setEditingEventId(null)} fullWidth={isMobile}>
                  Cancel
                </Button>
                <Button
                  startIcon={savingEventId === editingEventId ? <CircularProgress size={16} /> : <Save />}
                  variant="contained"
                  onClick={async () => {
                    const success = await handleUpdate(editingEventId);
                    if (success) {
                      setEditingEventId(null);
                    }
                  }}
                  disabled={savingEventId === editingEventId}
                  fullWidth={isMobile}
                >
                  {savingEventId === editingEventId ? 'Saving…' : 'Save event'}
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteEvent)}
        title={`Delete ${pendingDeleteEvent?.title ?? 'this event'}?`}
        description="This cannot be undone. All associated data, including participants and media, will be removed."
        confirmLabel="Delete event"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteEvent(null)}
        loading={confirmLoading}
      />

      <AdminEventOccurrencesDialog
        open={Boolean(selectedEvent)}
        event={selectedEvent}
        token={token}
        onClose={() => setSelectedEvent(null)}
        onOccurrencesChanged={refreshEvents}
      />
    </Stack>
  );
}
