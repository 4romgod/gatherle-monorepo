'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { Save, Delete } from '@mui/icons-material';
import { AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { EventStatus, EventLifecycleStatus, EventVisibility } from '@/data/graphql/types/graphql';
import { GetAllEventsDocument } from '@/data/graphql/query/Event/query';
import { UpdateEventDocument, DeleteEventByIdDocument } from '@/data/graphql/query/Event/mutation';
import { useAppContext } from '@/hooks/useAppContext';
import { SortOrderInput } from '@/data/graphql/types/graphql';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

type EventFormState = {
  status: EventStatus;
  lifecycleStatus: EventLifecycleStatus;
  visibility?: EventVisibility | null;
};

const STATUS_FIELDS = Object.values(EventStatus);
const LIFECYCLE_FIELDS = Object.values(EventLifecycleStatus);
const VISIBILITY_FIELDS = Object.values(EventVisibility);

export default function AdminEventsSection({ token }: AdminSectionProps) {
  const { setToastProps } = useAppContext();
  const { data, loading, error, refetch } = useQuery(GetAllEventsDocument, {
    variables: {
      options: {
        pagination: { limit: 10 },
        sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
      },
    },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });
  const events = data?.readEvents ?? [];
  const [eventFormState, setEventFormState] = useState<Record<string, EventFormState>>({});
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{ eventId: string; title: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [updateEvent] = useMutation(UpdateEventDocument, { context: { headers: getAuthHeader(token) } });
  const [deleteEvent] = useMutation(DeleteEventByIdDocument, { context: { headers: getAuthHeader(token) } });

  useEffect(() => {
    if (events.length > 0) {
      const nextState: Record<string, EventFormState> = {};
      events.forEach((event) => {
        nextState[event.eventId] = {
          status: event.status ?? EventStatus.Upcoming,
          lifecycleStatus: event.lifecycleStatus ?? EventLifecycleStatus.Draft,
          visibility: event.visibility ?? null,
        };
      });
      setEventFormState(nextState);
    }
  }, [events]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const handleUpdate = async (eventId: string) => {
    const payload = eventFormState[eventId];
    if (!payload) {
      return;
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
      await refetch();
      notify('Event status saved.');
    } catch {
      notify('Unable to update event.', 'error');
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
      await deleteEvent({ variables: { eventId: pendingDeleteEvent.eventId } });
      await refetch();
      notify('Event deleted.');
      setPendingDeleteEvent(null);
    } catch {
      notify('Unable to delete event.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (error) {
    return (
      <Box>
        <Typography color="error">Failed to load events.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={{ xs: 1, sm: 0 }}
      >
        <Typography variant="h5" fontWeight={700}>
          Events
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Showing {events.length} recent events
        </Typography>
      </Stack>

      {loading ? (
        <Stack spacing={2}>
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={90} />
          ))}
        </Stack>
      ) : events.length === 0 ? (
        <Typography color="text.secondary">No events available right now.</Typography>
      ) : (
        <Stack spacing={2}>
          {events.map((event) => {
            const formState = eventFormState[event.eventId];
            return (
              <Card
                key={event.eventId}
                elevation={0}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                      spacing={{ xs: 1.5, sm: 0 }}
                    >
                      <Stack spacing={0.3}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {event.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.slug}
                        </Typography>
                      </Stack>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', sm: 'auto' }}>
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
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Save />}
                          onClick={() => handleUpdate(event.eventId)}
                          disabled={!formState || savingEventId === event.eventId}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          {savingEventId === event.eventId ? <CircularProgress size={16} /> : 'Save'}
                        </Button>
                      </Stack>
                    </Stack>
                    <Divider />
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                          label="Status"
                          value={formState?.status ?? EventStatus.Upcoming}
                          onChange={(e) =>
                            setEventFormState((prev) => ({
                              ...prev,
                              [event.eventId]: {
                                ...(prev[event.eventId] ?? {}),
                                status: e.target.value as EventStatus,
                              },
                            }))
                          }
                          name={event.eventId}
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
                          value={formState?.lifecycleStatus ?? EventLifecycleStatus.Draft}
                          onChange={(e) =>
                            setEventFormState((prev) => ({
                              ...prev,
                              [event.eventId]: {
                                ...(prev[event.eventId] ?? {}),
                                lifecycleStatus: e.target.value as EventLifecycleStatus,
                              },
                            }))
                          }
                          name={event.eventId}
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
                          value={formState?.visibility ?? ''}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setEventFormState((prev) => ({
                              ...prev,
                              [event.eventId]: {
                                ...(prev[event.eventId] ?? {}),
                                visibility: nextValue ? (nextValue as EventVisibility) : undefined,
                              },
                            }));
                          }}
                          name={event.eventId}
                        >
                          <MenuItem value="">
                            <em>Do not change</em>
                          </MenuItem>
                          {VISIBILITY_FIELDS.map((value) => (
                            <MenuItem key={value} value={value}>
                              {value}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
      <ConfirmDialog
        open={Boolean(pendingDeleteEvent)}
        title={`Delete ${pendingDeleteEvent?.title ?? 'this event'}?`}
        description="This cannot be undone. All associated data (participants, media) will be removed."
        confirmLabel="Delete event"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteEvent(null)}
        loading={confirmLoading}
      />
    </Stack>
  );
}
