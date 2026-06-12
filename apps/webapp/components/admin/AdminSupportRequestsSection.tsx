'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button, Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
import ContactSupportRoundedIcon from '@mui/icons-material/ContactSupportRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { SupportRequestKind, SupportRequestStatus } from '@/data/graphql/types/graphql';
import { ReadSupportRequestsDocument } from '@/data/graphql/query/SupportRequest/query';
import { UpdateSupportRequestStatusDocument } from '@/data/graphql/mutation/SupportRequest/mutation';
import { useAppContext } from '@/hooks/useAppContext';
import {
  ADMIN_SURFACE_SX,
  AdminEmptyState,
  AdminListSearchField,
  AdminSectionHeader,
} from '@/components/admin/admin-ui';

type SupportQueue = 'all' | SupportRequestStatus;

const SUPPORT_QUEUE_FILTERS: Array<{ value: SupportQueue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: SupportRequestStatus.Open, label: 'Open' },
  { value: SupportRequestStatus.Resolved, label: 'Resolved' },
];

function buildSupportRequestQueryInput(searchQuery: string, queue: SupportQueue) {
  const trimmedQuery = searchQuery.trim();

  return {
    ...(queue !== 'all' ? { status: queue } : {}),
    ...(trimmedQuery.length >= 2 ? { search: trimmedQuery } : {}),
    limit: 100,
  };
}

function getStatusChipColor(status: SupportRequestStatus): 'default' | 'success' {
  return status === SupportRequestStatus.Resolved ? 'success' : 'default';
}

function getKindLabel(kind: SupportRequestKind) {
  switch (kind) {
    case SupportRequestKind.Help:
      return 'Help';
    case SupportRequestKind.Bug:
      return 'Bug';
    case SupportRequestKind.Idea:
      return 'Idea';
    case SupportRequestKind.TrustAndSafety:
      return 'Trust & safety';
    default:
      return kind;
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

export default function AdminSupportRequestsSection({ token }: AdminSectionProps) {
  const { setToastProps } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeQueue, setActiveQueue] = useState<SupportQueue>('all');
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const queryInput = useMemo(
    () => buildSupportRequestQueryInput(debouncedSearchQuery, activeQueue),
    [activeQueue, debouncedSearchQuery],
  );

  const { data, loading, error, refetch } = useQuery(ReadSupportRequestsDocument, {
    variables: {
      input: queryInput,
    },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  const supportRequests = useMemo(() => data?.readSupportRequests ?? [], [data]);

  const [updateSupportRequestStatus] = useMutation(UpdateSupportRequestStatusDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((previous) => ({
      ...previous,
      message,
      open: true,
      severity,
    }));
  };

  const refreshSupportRequests = async () => {
    await refetch({
      input: buildSupportRequestQueryInput(debouncedSearchQuery, activeQueue),
    });
  };

  const handleUpdateStatus = async (supportRequestId: string, status: SupportRequestStatus) => {
    setSavingRequestId(supportRequestId);

    try {
      await updateSupportRequestStatus({
        variables: {
          input: {
            supportRequestId,
            status,
          },
        },
      });
      await refreshSupportRequests();
      notify(`Request moved to ${status.toLowerCase()}.`);
    } catch {
      notify('Unable to update support request status.', 'error');
    } finally {
      setSavingRequestId(null);
    }
  };

  if (error) {
    return <Typography color="error">Unable to load support requests right now.</Typography>;
  }

  return (
    <Stack spacing={3}>
      <AdminSectionHeader
        title="Support inbox"
        description="Review user help requests, bug reports, ideas, and trust or safety escalations from inside Gatherle."
        meta={
          <Chip
            size="small"
            label={debouncedSearchQuery ? `${supportRequests.length} matches` : `${supportRequests.length} loaded`}
          />
        }
      />

      <AdminListSearchField
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by email, subject, message, or page path"
        helperText="Type at least 2 characters to filter the support inbox."
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {SUPPORT_QUEUE_FILTERS.map((queue) => (
          <Chip
            key={queue.value}
            clickable
            color={activeQueue === queue.value ? 'primary' : 'default'}
            label={queue.label}
            onClick={() => setActiveQueue(queue.value)}
            variant={activeQueue === queue.value ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {loading && supportRequests.length === 0 ? (
        <Stack spacing={2}>
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} variant="rounded" height={280} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : supportRequests.length === 0 ? (
        <AdminEmptyState
          title={debouncedSearchQuery ? 'No matching support requests' : 'No support requests yet'}
          description={
            debouncedSearchQuery
              ? 'Try a different email address, subject line, route, or message fragment.'
              : 'Requests submitted from the new help and feedback flow will appear here.'
          }
        />
      ) : (
        <Stack spacing={2}>
          {supportRequests.map((supportRequest) => {
            const isSaving = savingRequestId === supportRequest.supportRequestId;
            const nextStatus =
              supportRequest.status === SupportRequestStatus.Open
                ? SupportRequestStatus.Resolved
                : SupportRequestStatus.Open;

            return (
              <Card key={supportRequest.supportRequestId} elevation={0} sx={ADMIN_SURFACE_SX}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: 'column', lg: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', lg: 'center' }}
                      spacing={2}
                    >
                      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <ContactSupportRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {supportRequest.subject}
                          </Typography>
                        </Stack>
                        <Typography color="text.secondary" variant="body2">
                          {supportRequest.requesterEmail} • {formatTimestamp(supportRequest.createdAt)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={getKindLabel(supportRequest.kind)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={supportRequest.status}
                          size="small"
                          color={getStatusChipColor(supportRequest.status)}
                          variant={supportRequest.status === SupportRequestStatus.Resolved ? 'filled' : 'outlined'}
                        />
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {supportRequest.platform ? (
                        <Chip label={`Platform: ${supportRequest.platform}`} size="small" variant="outlined" />
                      ) : null}
                      {supportRequest.appVersion ? (
                        <Chip label={`App: ${supportRequest.appVersion}`} size="small" variant="outlined" />
                      ) : null}
                      {supportRequest.buildVersion ? (
                        <Chip label={`Build: ${supportRequest.buildVersion}`} size="small" variant="outlined" />
                      ) : null}
                      {supportRequest.pagePath ? (
                        <Chip label={`Route: ${supportRequest.pagePath}`} size="small" variant="outlined" />
                      ) : null}
                    </Stack>

                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        color: 'text.secondary',
                      }}
                    >
                      {supportRequest.message}
                    </Typography>

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      spacing={1.5}
                    >
                      {supportRequest.screenshotUrl ? (
                        <Button
                          component="a"
                          href={supportRequest.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          size="small"
                          startIcon={<OpenInNewRoundedIcon />}
                          variant="outlined"
                        >
                          Open screenshot
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No screenshot attached.
                        </Typography>
                      )}

                      <Button
                        disabled={isSaving}
                        onClick={() => void handleUpdateStatus(supportRequest.supportRequestId, nextStatus)}
                        size="small"
                        variant={supportRequest.status === SupportRequestStatus.Open ? 'contained' : 'outlined'}
                      >
                        {isSaving
                          ? 'Saving...'
                          : supportRequest.status === SupportRequestStatus.Open
                            ? 'Mark resolved'
                            : 'Reopen'}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
