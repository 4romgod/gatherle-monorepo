'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client';
import { Add, Delete, Edit, Event as EventIcon } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { FilterOperatorInput, SortOrderInput } from '@/data/graphql/types/graphql';
import { GetAllEventsDocument } from '@/data/graphql/query/Event/query';
import { DeleteEventByIdDocument } from '@/data/graphql/query/Event/mutation';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { useAppContext } from '@/hooks/useAppContext';
import { useSession } from 'next-auth/react';

type UserEventsListProps = {
  userId: string;
};

export default function UserEventsList({ userId }: UserEventsListProps) {
  const { setToastProps } = useAppContext();
  const { data: session } = useSession();
  const token = session?.user?.token;
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{ eventId: string; title: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { data, loading, error, refetch } = useQuery(GetAllEventsDocument, {
    variables: {
      options: {
        filters: [
          {
            field: 'organizers.user.userId',
            operator: FilterOperatorInput.Eq,
            value: userId,
          },
        ],
        sort: [
          {
            field: 'createdAt',
            order: SortOrderInput.Desc,
          },
        ],
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const events = data?.readEvents ?? [];
  const [deleteEvent] = useMutation(DeleteEventByIdDocument);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteEvent) {
      return;
    }

    if (!token) {
      notify('Please sign in to delete events.', 'error');
      return;
    }

    setConfirmLoading(true);
    try {
      await deleteEvent({
        variables: { eventId: pendingDeleteEvent.eventId },
        context: { headers: getAuthHeader(token) },
      });
      await refetch();
      notify('Event deleted.');
      setPendingDeleteEvent(null);
    } catch {
      notify('Unable to delete event.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EventIcon fontSize="small" color="primary" />
              <Typography variant="overline" letterSpacing={2} fontWeight={700} color="primary.main">
                My events
              </Typography>
            </Stack>
            <Typography variant="h6" fontWeight={700}>
              Manage events you host
            </Typography>
            <Typography color="text.secondary">
              Update details or remove events without leaving your account settings.
            </Typography>
          </Stack>
          <Button
            component={Link}
            href={ROUTES.ACCOUNT.EVENTS.CREATE}
            variant="contained"
            startIcon={<Add />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Create event
          </Button>
        </Stack>

        {loading ? (
          <Stack spacing={1}>
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} variant="rounded" height={90} />
            ))}
          </Stack>
        ) : error ? (
          <Typography color="error">Unable to load your events right now.</Typography>
        ) : events.length === 0 ? (
          <Card elevation={0} sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              You have not created any events yet.
            </Typography>
            <Button component={Link} href={ROUTES.ACCOUNT.EVENTS.CREATE} sx={{ mt: 2 }}>
              Create your first event
            </Button>
          </Card>
        ) : (
          <Stack spacing={2}>
            {events.map((event) => (
              <Card
                key={event.eventId}
                elevation={0}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {event.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.slug}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button
                          component={Link}
                          href={ROUTES.ACCOUNT.EVENTS.EDIT_EVENT(event.slug)}
                          size="small"
                          startIcon={<Edit />}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => setPendingDeleteEvent({ eventId: event.eventId, title: event.title })}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Stack>
                    <Divider />
                    <Stack direction="row" flexWrap="wrap" spacing={1}>
                      <Chip label={event.status ?? 'Status unknown'} size="small" />
                      <Chip label={event.lifecycleStatus ?? 'Draft'} size="small" />
                      {event.visibility && <Chip label={event.visibility} size="small" />}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <ConfirmDialog
        open={Boolean(pendingDeleteEvent)}
        title={`Delete ${pendingDeleteEvent?.title ?? 'this event'}?`}
        description="This action cannot be undone."
        confirmLabel="Delete event"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteEvent(null)}
        loading={confirmLoading}
      />
    </Box>
  );
}
