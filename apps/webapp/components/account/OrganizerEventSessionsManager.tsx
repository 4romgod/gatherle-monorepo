'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter, useSearchParams } from 'next/navigation';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
  formatOccurrenceDateTime,
  formatOccurrenceSessionDate,
  formatOccurrenceSessionTime,
  formatRecurrenceRule,
} from '@/components/events/date-utils';
import type {
  EventDetail,
  EventOccurrenceParticipantPreview,
  EventOccurrencePreview,
} from '@/data/graphql/query/Event/types';
import { SplitEventSeriesAtOccurrenceDocument } from '@/data/graphql/query/Event/mutation';
import { GetEventOccurrencesDocument } from '@/data/graphql/query/EventOccurrence/query';
import {
  CancelEventOccurrenceDocument,
  UpdateEventOccurrenceDocument,
} from '@/data/graphql/mutation/EventOccurrence/mutation';
import { EventOccurrenceStatus, ParticipantStatus } from '@/data/graphql/types/graphql';
import { useAppContext } from '@/hooks/useAppContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import { getOccurrenceAnchor, getRequestedOccurrenceAnchor } from '@/components/events/occurrence-url';
import {
  ORGANIZER_OCCURRENCE_PAGE_SIZE,
  ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS,
  ORGANIZER_OCCURRENCE_LOOKBACK_DAYS,
  buildIsoFromTimeZoneDateAndTime,
  buildOccurrenceParticipantBreakdown,
  buildOrganizerOccurrenceQueryOptions,
  formatDateInputInTimeZone,
  formatTimeInputInTimeZone,
  getOccurrenceStatusTone,
  getOrganizerOccurrenceWindow,
} from './organizer-session-utils';

type OrganizerEventSessionsManagerProps = {
  event: EventDetail;
  token?: string | null;
};

type EditableOccurrenceState = {
  endDate: string;
  endTime: string;
  label: string;
  occurrenceId: string;
  startDate: string;
  startTime: string;
  timezone: string;
};

function getParticipantLabel(participant: EventOccurrenceParticipantPreview, index: number) {
  const user = participant.user;
  if (!user) {
    return `Participant ${index + 1}`;
  }

  const fullName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  return fullName || (user.username ? `@${user.username}` : `Participant ${index + 1}`);
}

function getParticipantSecondaryLabel(participant: EventOccurrenceParticipantPreview) {
  const statusLabel = participant.status === ParticipantStatus.CheckedIn ? 'Checked in' : participant.status;
  const quantityLabel = participant.quantity && participant.quantity > 1 ? ` · ${participant.quantity} spots` : '';
  return `${statusLabel}${quantityLabel}`;
}

export default function OrganizerEventSessionsManager({ event, token }: OrganizerEventSessionsManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToastProps } = useAppContext();
  const [pendingCancelOccurrence, setPendingCancelOccurrence] = useState<{
    label: string;
    occurrenceId: string;
  } | null>(null);
  const [pendingSplitOccurrence, setPendingSplitOccurrence] = useState<{
    label: string;
    occurrenceId: string;
  } | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<EditableOccurrenceState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<string | null>(null);
  const [initialActionHandled, setInitialActionHandled] = useState(false);

  const occurrenceWindow = useMemo(() => getOrganizerOccurrenceWindow(), []);
  const initialOptions = useMemo(
    () => buildOrganizerOccurrenceQueryOptions(event.eventId, occurrenceWindow, ORGANIZER_OCCURRENCE_PAGE_SIZE, 0),
    [event.eventId, occurrenceWindow],
  );
  const requestedOccurrenceAnchor = getRequestedOccurrenceAnchor(searchParams);
  const requestedAction = searchParams.get('action');

  const { data, loading, error, refetch, fetchMore } = useQuery(GetEventOccurrencesDocument, {
    variables: { options: initialOptions },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  const { data: requestedOccurrenceData } = useQuery(GetEventOccurrencesDocument, {
    skip: !requestedOccurrenceAnchor,
    variables: {
      options: {
        dateRange: {
          startDate: requestedOccurrenceAnchor ?? '',
          endDate: requestedOccurrenceAnchor ?? '',
        },
        filters: [{ field: 'eventId', value: event.eventId }],
        pagination: { limit: 1, skip: 0 },
      },
    },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const occurrences = (data?.readEventOccurrences ?? []) as EventOccurrencePreview[];
  const totalCount = data?.readEventOccurrencesCount ?? 0;
  const requestedOccurrence = (requestedOccurrenceData?.readEventOccurrences?.[0] ??
    null) as EventOccurrencePreview | null;

  const [cancelEventOccurrence] = useMutation(CancelEventOccurrenceDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [updateEventOccurrence] = useMutation(UpdateEventOccurrenceDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [splitEventSeriesAtOccurrence] = useMutation(SplitEventSeriesAtOccurrenceDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    if (!loading) {
      setHasMore(occurrences.length < totalCount);
    }
  }, [loading, occurrences.length, totalCount]);

  useEffect(() => {
    setInitialActionHandled(false);
  }, [event.eventId, requestedAction, requestedOccurrenceAnchor]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const refreshOccurrences = async () => {
    const requestedLimit = Math.max(occurrences.length, ORGANIZER_OCCURRENCE_PAGE_SIZE);
    const result = await refetch({
      options: buildOrganizerOccurrenceQueryOptions(event.eventId, occurrenceWindow, requestedLimit, 0),
    });
    const refreshedOccurrences = result.data?.readEventOccurrences ?? [];
    const refreshedTotalCount = result.data?.readEventOccurrencesCount ?? refreshedOccurrences.length;
    setHasMore(refreshedOccurrences.length < refreshedTotalCount);
  };

  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    let nextBatchCount = 0;
    let nextTotalCount = totalCount;

    try {
      await fetchMore({
        variables: {
          options: buildOrganizerOccurrenceQueryOptions(
            event.eventId,
            occurrenceWindow,
            ORGANIZER_OCCURRENCE_PAGE_SIZE,
            occurrences.length,
          ),
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const nextItems = fetchMoreResult?.readEventOccurrences ?? [];
          nextBatchCount = nextItems.length;
          nextTotalCount = fetchMoreResult?.readEventOccurrencesCount ?? previousResult.readEventOccurrencesCount ?? 0;

          if (nextItems.length === 0) {
            return previousResult;
          }

          return {
            ...previousResult,
            readEventOccurrences: [...(previousResult.readEventOccurrences ?? []), ...nextItems],
            readEventOccurrencesCount: nextTotalCount,
          };
        },
      });

      setHasMore(occurrences.length + nextBatchCount < nextTotalCount);
    } catch {
      notify('Unable to load more sessions.', 'error');
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

  const openEditDialog = useCallback((occurrence: EventOccurrencePreview) => {
    setFormError(null);
    setEditingOccurrence({
      endDate: formatDateInputInTimeZone(occurrence.endAt, occurrence.timezone),
      endTime: formatTimeInputInTimeZone(occurrence.endAt, occurrence.timezone),
      label: formatOccurrenceDateTime(occurrence.startAt, occurrence.endAt, occurrence.timezone),
      occurrenceId: occurrence.occurrenceId,
      startDate: formatDateInputInTimeZone(occurrence.startAt, occurrence.timezone),
      startTime: formatTimeInputInTimeZone(occurrence.startAt, occurrence.timezone),
      timezone: occurrence.timezone,
    });
  }, []);

  const focusedOccurrence = useMemo(() => {
    if (!requestedOccurrenceAnchor) {
      return null;
    }

    return (
      occurrences.find((occurrence) => getOccurrenceAnchor(occurrence) === requestedOccurrenceAnchor) ??
      requestedOccurrence ??
      null
    );
  }, [occurrences, requestedOccurrence, requestedOccurrenceAnchor]);

  useEffect(() => {
    if (initialActionHandled || !focusedOccurrence) {
      return;
    }

    setExpandedOccurrenceId(focusedOccurrence.occurrenceId);

    if (requestedAction === 'edit' && focusedOccurrence.status === EventOccurrenceStatus.Scheduled) {
      openEditDialog(focusedOccurrence);
    }

    if (requestedAction === 'cancel' && focusedOccurrence.status === EventOccurrenceStatus.Scheduled) {
      setPendingCancelOccurrence({
        label: formatOccurrenceDateTime(focusedOccurrence.startAt, focusedOccurrence.endAt, focusedOccurrence.timezone),
        occurrenceId: focusedOccurrence.occurrenceId,
      });
    }

    setInitialActionHandled(true);
  }, [focusedOccurrence, initialActionHandled, openEditDialog, requestedAction]);

  const handleSaveEdit = async () => {
    if (!editingOccurrence) {
      return;
    }

    const startAt = buildIsoFromTimeZoneDateAndTime(
      editingOccurrence.startDate,
      editingOccurrence.startTime,
      editingOccurrence.timezone,
    );

    if (!startAt) {
      setFormError('Enter a valid start date and time.');
      return;
    }

    const hasEndFields = Boolean(editingOccurrence.endDate.trim() || editingOccurrence.endTime.trim());
    const endAt = hasEndFields
      ? buildIsoFromTimeZoneDateAndTime(
          editingOccurrence.endDate,
          editingOccurrence.endTime,
          editingOccurrence.timezone,
        )
      : null;

    if (hasEndFields && !endAt) {
      setFormError('Enter a complete end date and time, or clear both end fields.');
      return;
    }

    if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setFormError('The session end must be after the start.');
      return;
    }

    setSavingEdit(true);
    setFormError(null);

    try {
      await updateEventOccurrence({
        variables: {
          input: {
            occurrenceId: editingOccurrence.occurrenceId,
            startAt,
            endAt,
          },
        },
      });

      await refreshOccurrences();
      notify('Session updated.');
      setEditingOccurrence(null);
    } catch {
      setFormError('Unable to update this session right now.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!pendingCancelOccurrence) {
      return;
    }

    setConfirmLoading(true);

    try {
      await cancelEventOccurrence({
        variables: {
          input: {
            occurrenceId: pendingCancelOccurrence.occurrenceId,
          },
        },
      });

      await refreshOccurrences();
      notify('Session cancelled.');
      setPendingCancelOccurrence(null);
    } catch {
      notify('Unable to cancel this session.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmSplit = async () => {
    if (!pendingSplitOccurrence) {
      return;
    }

    setSplitLoading(true);

    try {
      const result = await splitEventSeriesAtOccurrence({
        variables: {
          input: {
            occurrenceId: pendingSplitOccurrence.occurrenceId,
          },
        },
      });

      const nextSlug = result.data?.splitEventSeriesAtOccurrence.slug;
      notify('Future sessions split into a new series.');
      setPendingSplitOccurrence(null);

      if (nextSlug) {
        router.push(ROUTES.ACCOUNT.EVENTS.SESSIONS(nextSlug));
        return;
      }

      await refreshOccurrences();
    } catch {
      notify('Unable to split this series at the selected session.', 'error');
    } finally {
      setSplitLoading(false);
    }
  };

  return (
    <>
      <Stack spacing={3}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle1" fontWeight={800}>
                  Operational window
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Showing the last {ORGANIZER_OCCURRENCE_LOOKBACK_DAYS} days and the next{' '}
                  {Math.floor(ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS / 30)} months of generated sessions for this series.
                </Typography>
              </Stack>
              <Chip
                label={`${totalCount} session${totalCount === 1 ? '' : 's'} in window`}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  color: 'primary.main',
                  fontWeight: 800,
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {loading && occurrences.length === 0 ? (
          <Stack spacing={2}>
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} variant="rounded" height={220} sx={{ borderRadius: 3 }} />
            ))}
          </Stack>
        ) : error ? (
          <Alert severity="error">Unable to load sessions right now.</Alert>
        ) : occurrences.length === 0 ? (
          <Alert severity="info">
            No generated sessions are available in the current window.{' '}
            {formatRecurrenceRule(event.primarySchedule.recurrenceRule)}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {occurrences.map((occurrence) => {
              const isScheduled = occurrence.status === EventOccurrenceStatus.Scheduled;
              const participantBreakdown = buildOccurrenceParticipantBreakdown(occurrence.participants);
              const participantList = occurrence.participants ?? [];
              const showAttendees = expandedOccurrenceId === occurrence.occurrenceId;

              return (
                <Card
                  key={occurrence.occurrenceId}
                  elevation={0}
                  sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                >
                  <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        spacing={1.5}
                      >
                        <Stack spacing={0.4}>
                          <Typography variant="subtitle1" fontWeight={800}>
                            {formatOccurrenceSessionDate(occurrence.startAt, occurrence.timezone)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatOccurrenceSessionTime(occurrence.startAt, occurrence.timezone)}
                            {occurrence.endAt
                              ? ` - ${formatOccurrenceSessionTime(occurrence.endAt, occurrence.timezone)}`
                              : ''}
                            {occurrence.timezone ? ` · ${occurrence.timezone}` : ''}
                          </Typography>
                          {occurrence.isException ? (
                            <Typography variant="caption" color="text.secondary">
                              Original slot ·{' '}
                              {formatOccurrenceDateTime(occurrence.originalStartAt, null, occurrence.timezone)}
                            </Typography>
                          ) : null}
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', md: 'auto' }}>
                          <Button
                            size="small"
                            startIcon={<EditCalendarRoundedIcon />}
                            variant="outlined"
                            disabled={!isScheduled}
                            onClick={() => openEditDialog(occurrence)}
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                          >
                            Edit session
                          </Button>
                          <Button
                            size="small"
                            startIcon={<CallSplitRoundedIcon />}
                            variant="outlined"
                            disabled={!isScheduled}
                            onClick={() =>
                              setPendingSplitOccurrence({
                                label: formatOccurrenceDateTime(
                                  occurrence.startAt,
                                  occurrence.endAt,
                                  occurrence.timezone,
                                ),
                                occurrenceId: occurrence.occurrenceId,
                              })
                            }
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                          >
                            Split here
                          </Button>
                          <Button
                            size="small"
                            startIcon={<EventBusyRoundedIcon />}
                            variant="outlined"
                            color="error"
                            disabled={!isScheduled}
                            onClick={() =>
                              setPendingCancelOccurrence({
                                label: formatOccurrenceDateTime(
                                  occurrence.startAt,
                                  occurrence.endAt,
                                  occurrence.timezone,
                                ),
                                occurrenceId: occurrence.occurrenceId,
                              })
                            }
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                          >
                            {isScheduled ? 'Cancel session' : occurrence.status}
                          </Button>
                        </Stack>
                      </Stack>

                      <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
                        <Chip
                          size="small"
                          color={getOccurrenceStatusTone(occurrence.status)}
                          variant={occurrence.status === EventOccurrenceStatus.Completed ? 'outlined' : 'filled'}
                          label={occurrence.status}
                        />
                        {occurrence.isException ? <Chip size="small" variant="outlined" label="Exception" /> : null}
                        <Chip size="small" variant="outlined" label={`${occurrence.rsvpCount ?? 0} RSVPs`} />
                        {participantBreakdown.going > 0 ? (
                          <Chip size="small" variant="outlined" label={`${participantBreakdown.going} going`} />
                        ) : null}
                        {participantBreakdown.checkedIn > 0 ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            color="success"
                            label={`${participantBreakdown.checkedIn} checked in`}
                          />
                        ) : null}
                        {participantBreakdown.interested > 0 ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${participantBreakdown.interested} interested`}
                          />
                        ) : null}
                        {participantBreakdown.waitlisted > 0 ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            color="warning"
                            label={`${participantBreakdown.waitlisted} waitlisted`}
                          />
                        ) : null}
                      </Stack>

                      <Divider />

                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <GroupsRoundedIcon color="action" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={800}>
                              Attendee state
                            </Typography>
                          </Stack>
                          <Button
                            size="small"
                            endIcon={showAttendees ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                            onClick={() =>
                              setExpandedOccurrenceId((current) =>
                                current === occurrence.occurrenceId ? null : occurrence.occurrenceId,
                              )
                            }
                          >
                            {showAttendees ? 'Hide attendees' : 'Show attendees'}
                          </Button>
                        </Stack>

                        <Collapse in={showAttendees}>
                          {participantList.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No attendee records have been created for this session yet.
                            </Typography>
                          ) : (
                            <List disablePadding sx={{ display: 'grid', gap: 1.25 }}>
                              {participantList.map((participant, index) => (
                                <Card
                                  key={participant.participantId}
                                  elevation={0}
                                  sx={{
                                    borderRadius: 2.5,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
                                    border: '1px solid',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <ListItem sx={{ py: 1.2, px: 1.5 }}>
                                    <ListItemAvatar sx={{ minWidth: 44 }}>
                                      <Avatar
                                        src={participant.user?.profile_picture ?? undefined}
                                        alt={getParticipantLabel(participant, index)}
                                      >
                                        {getParticipantLabel(participant, index).slice(0, 1).toUpperCase()}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={getParticipantLabel(participant, index)}
                                      primaryTypographyProps={{ fontWeight: 700, variant: 'body2' }}
                                      secondary={getParticipantSecondaryLabel(participant)}
                                      secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                </Card>
                              ))}
                            </List>
                          )}
                        </Collapse>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}

            <Box ref={infiniteScrollRef} sx={{ py: 2, textAlign: 'center' }}>
              {loadingMore ? (
                <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Loading more sessions…
                  </Typography>
                </Stack>
              ) : hasMore ? (
                <Typography variant="body2" color="text.secondary">
                  Scroll to load more sessions.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Loaded all {occurrences.length} sessions in this window.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </Stack>

      <Dialog open={Boolean(editingOccurrence)} onClose={() => setEditingOccurrence(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit session</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          {editingOccurrence ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {editingOccurrence.label}
              </Typography>
              <Chip label={`Timezone · ${editingOccurrence.timezone}`} size="small" sx={{ width: 'fit-content' }} />
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Start date"
                  type="date"
                  value={editingOccurrence.startDate}
                  onChange={(event) =>
                    setEditingOccurrence((current) =>
                      current ? { ...current, startDate: event.target.value } : current,
                    )
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Start time"
                  type="time"
                  value={editingOccurrence.startTime}
                  onChange={(event) =>
                    setEditingOccurrence((current) =>
                      current ? { ...current, startTime: event.target.value } : current,
                    )
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="End date"
                  type="date"
                  value={editingOccurrence.endDate}
                  onChange={(event) =>
                    setEditingOccurrence((current) => (current ? { ...current, endDate: event.target.value } : current))
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End time"
                  type="time"
                  value={editingOccurrence.endTime}
                  onChange={(event) =>
                    setEditingOccurrence((current) => (current ? { ...current, endTime: event.target.value } : current))
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Leave both end fields blank if the session no longer needs an explicit end time.
              </Typography>
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditingOccurrence(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveEdit()} disabled={savingEdit}>
            {savingEdit ? 'Saving…' : 'Save session'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingCancelOccurrence)}
        title={`Cancel ${pendingCancelOccurrence?.label ?? 'this session'}?`}
        description="This only cancels the selected session. The parent event series stays active."
        confirmLabel="Cancel session"
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancelOccurrence(null)}
        loading={confirmLoading}
      />

      <ConfirmDialog
        open={Boolean(pendingSplitOccurrence)}
        title={`Split at ${pendingSplitOccurrence?.label ?? 'this session'}?`}
        description="Past sessions stay on the current series. This session and all following ones move into a new event series."
        confirmLabel="Split series"
        onConfirm={handleConfirmSplit}
        onCancel={() => setPendingSplitOccurrence(null)}
        loading={splitLoading}
      />
    </>
  );
}
