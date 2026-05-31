'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import {
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AdminEventSeriesPreview } from '@/components/admin/types';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
  ADMIN_MUTED_SURFACE_SX,
  ADMIN_SURFACE_SX,
  AdminEmptyState,
  AdminListFooter,
} from '@/components/admin/admin-ui';
import {
  formatOccurrenceDateTime,
  formatOccurrenceSessionDate,
  formatOccurrenceSessionTime,
  formatRecurrenceRule,
} from '@/components/events/date-utils';
import { SplitEventSeriesAtOccurrenceDocument } from '@/data/graphql/query/Event/mutation';
import { GetEventOccurrencesDocument } from '@/data/graphql/query/EventOccurrence/query';
import { CancelEventOccurrenceDocument, EventOccurrenceStatus, SortOrderInput } from '@/data/graphql/types/graphql';
import { useAppContext } from '@/hooks/useAppContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { getAuthHeader } from '@/lib/utils/auth';

type AdminEventOccurrencesDialogProps = {
  open: boolean;
  event: AdminEventSeriesPreview | null;
  token?: string | null;
  onClose: () => void;
  onOccurrencesChanged?: () => Promise<void> | void;
};

const PAGE_SIZE = 12;
const OCCURRENCE_LOOKBACK_DAYS = 30;
const OCCURRENCE_LOOKAHEAD_DAYS = 180;

function getOccurrenceWindow() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - OCCURRENCE_LOOKBACK_DAYS);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + OCCURRENCE_LOOKAHEAD_DAYS);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

function buildOccurrenceQueryOptions(
  eventId: string,
  dateRange: { startDate: Date; endDate: Date },
  limit: number,
  skip = 0,
) {
  return {
    pagination: { limit, skip },
    sort: [{ field: 'startAt', order: SortOrderInput.Asc }],
    // readEventOccurrences first resolves candidate event series, so this filter must target the series key.
    filters: [{ field: 'eventId', value: eventId }],
    dateRange,
  };
}

function getStatusTone(status: EventOccurrenceStatus) {
  switch (status) {
    case EventOccurrenceStatus.Cancelled:
      return 'error';
    case EventOccurrenceStatus.Completed:
      return 'default';
    case EventOccurrenceStatus.Scheduled:
    default:
      return 'primary';
  }
}

export default function AdminEventOccurrencesDialog({
  open,
  event,
  token,
  onClose,
  onOccurrencesChanged,
}: AdminEventOccurrencesDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const [pendingCancelOccurrence, setPendingCancelOccurrence] = useState<{
    occurrenceId: string;
    label: string;
  } | null>(null);
  const [pendingSplitOccurrence, setPendingSplitOccurrence] = useState<{ occurrenceId: string; label: string } | null>(
    null,
  );
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const eventId = event?.eventId ?? '';
  const occurrenceWindow = useMemo(() => {
    if (!open || !eventId) {
      return null;
    }

    return getOccurrenceWindow();
  }, [eventId, open]);

  const initialOptions = useMemo(() => {
    if (!eventId || !occurrenceWindow) {
      return null;
    }

    return buildOccurrenceQueryOptions(eventId, occurrenceWindow, PAGE_SIZE, 0);
  }, [eventId, occurrenceWindow]);

  const { data, loading, error, refetch, fetchMore } = useQuery(GetEventOccurrencesDocument, {
    variables: initialOptions ? { options: initialOptions } : undefined,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !initialOptions,
  });

  const occurrences = data?.readEventOccurrences ?? [];
  const totalCount = data?.readEventOccurrencesCount ?? 0;

  const [cancelEventOccurrence] = useMutation(CancelEventOccurrenceDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [splitEventSeriesAtOccurrence] = useMutation(SplitEventSeriesAtOccurrenceDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    if (!open) {
      setPendingCancelOccurrence(null);
      setPendingSplitOccurrence(null);
      setConfirmLoading(false);
      setSplitLoading(false);
      setLoadingMore(false);
      setHasMore(true);
    }
  }, [open]);

  useEffect(() => {
    if (!loading) {
      setHasMore(occurrences.length < totalCount);
    }
  }, [loading, occurrences.length, totalCount]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const refreshOccurrences = async () => {
    if (!eventId || !occurrenceWindow) {
      return;
    }

    const requestedLimit = Math.max(occurrences.length, PAGE_SIZE);
    const result = await refetch({
      options: buildOccurrenceQueryOptions(eventId, occurrenceWindow, requestedLimit, 0),
    });
    const refreshedOccurrences = result.data?.readEventOccurrences ?? [];
    const refreshedTotalCount = result.data?.readEventOccurrencesCount ?? refreshedOccurrences.length;
    setHasMore(refreshedOccurrences.length < refreshedTotalCount);
  };

  const handleLoadMore = async () => {
    if (!eventId || !occurrenceWindow || loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    let nextBatchCount = 0;
    let nextTotalCount = totalCount;

    try {
      await fetchMore({
        variables: {
          options: buildOccurrenceQueryOptions(eventId, occurrenceWindow, PAGE_SIZE, occurrences.length),
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
      await onOccurrencesChanged?.();
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
      await splitEventSeriesAtOccurrence({
        variables: {
          input: {
            occurrenceId: pendingSplitOccurrence.occurrenceId,
          },
        },
      });

      await onOccurrencesChanged?.();
      notify('Future sessions split into a new series.');
      setPendingSplitOccurrence(null);
      onClose();
    } catch {
      notify('Unable to split this series at the selected session.', 'error');
    } finally {
      setSplitLoading(false);
    }
  };

  const infiniteScrollRef = useInfiniteScroll({
    enabled: open && hasMore,
    loading: loading || loadingMore,
    onEndReached: () => {
      void handleLoadMore();
    },
  });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 0, md: 2 },
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Stack spacing={0.75} minWidth={0}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.12em' }}>
                Sessions
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.15 }}>
                {event?.title ?? 'Event sessions'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {event?.representativeOccurrence
                  ? `Next session · ${formatOccurrenceDateTime(
                      event.representativeOccurrence.startAt,
                      event.representativeOccurrence.endAt,
                      event.representativeOccurrence.timezone,
                    )}`
                  : formatRecurrenceRule(event?.primarySchedule?.recurrenceRule)}
              </Typography>
            </Stack>

            <IconButton onClick={onClose} aria-label="Close sessions panel" size="small" sx={{ mt: 0.25 }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              sx={{ ...ADMIN_MUTED_SURFACE_SX, p: { xs: 2, md: 2.5 } }}
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" fontWeight={800}>
                  Operational window
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Showing the last {OCCURRENCE_LOOKBACK_DAYS} days and the next{' '}
                  {Math.floor(OCCURRENCE_LOOKAHEAD_DAYS / 30)} months of generated sessions for this series.
                </Typography>
              </Stack>
              <Chip
                size="small"
                label={`${totalCount} session${totalCount === 1 ? '' : 's'} in window`}
                sx={{
                  bgcolor: (currentTheme) => alpha(currentTheme.palette.primary.main, 0.08),
                  color: 'primary.main',
                  fontWeight: 800,
                }}
              />
            </Stack>

            {loading && occurrences.length === 0 ? (
              <Stack spacing={2}>
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} variant="rounded" height={148} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            ) : error ? (
              <Typography color="error">Unable to load sessions right now.</Typography>
            ) : occurrences.length === 0 ? (
              <AdminEmptyState
                title="No generated sessions in this window"
                description="This series may be outside the current operational window, or its schedule has not produced any sessions yet."
              />
            ) : (
              <Stack spacing={2}>
                {occurrences.map((occurrence) => {
                  const isScheduled = occurrence.status === EventOccurrenceStatus.Scheduled;

                  return (
                    <Card key={occurrence.occurrenceId} elevation={0} sx={ADMIN_SURFACE_SX}>
                      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                        <Stack spacing={1.75}>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', md: 'center' }}
                            spacing={1.5}
                          >
                            <Stack spacing={0.35}>
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

                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={1}
                              width={{ xs: '100%', md: 'auto' }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CallSplitRoundedIcon />}
                                disabled={!isScheduled}
                                onClick={() =>
                                  setPendingSplitOccurrence({
                                    occurrenceId: occurrence.occurrenceId,
                                    label: formatOccurrenceDateTime(
                                      occurrence.startAt,
                                      occurrence.endAt,
                                      occurrence.timezone,
                                    ),
                                  })
                                }
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                Split here
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<EventBusyRoundedIcon />}
                                disabled={!isScheduled}
                                onClick={() =>
                                  setPendingCancelOccurrence({
                                    occurrenceId: occurrence.occurrenceId,
                                    label: formatOccurrenceDateTime(
                                      occurrence.startAt,
                                      occurrence.endAt,
                                      occurrence.timezone,
                                    ),
                                  })
                                }
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                {isScheduled ? 'Cancel session' : occurrence.status}
                              </Button>
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                              size="small"
                              color={getStatusTone(occurrence.status)}
                              variant={occurrence.status === EventOccurrenceStatus.Completed ? 'outlined' : 'filled'}
                              label={occurrence.status}
                            />
                            {occurrence.isException ? <Chip size="small" variant="outlined" label="Exception" /> : null}
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${occurrence.rsvpCount ?? 0} RSVP${occurrence.rsvpCount === 1 ? '' : 's'}`}
                            />
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}

                <AdminListFooter
                  label="session"
                  loadedCount={occurrences.length}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  sentinelRef={infiniteScrollRef}
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingCancelOccurrence)}
        title={`Cancel ${pendingCancelOccurrence?.label ?? 'this session'}?`}
        description="This only cancels the selected session. The parent event series will stay active."
        confirmLabel="Cancel session"
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancelOccurrence(null)}
        loading={confirmLoading}
      />

      <ConfirmDialog
        open={Boolean(pendingSplitOccurrence)}
        title={`Split at ${pendingSplitOccurrence?.label ?? 'this session'}?`}
        description="Past sessions stay on the current series. This session and every future one move into a new series."
        confirmLabel="Split series"
        onConfirm={handleConfirmSplit}
        onCancel={() => setPendingSplitOccurrence(null)}
        loading={splitLoading}
      />
    </>
  );
}
