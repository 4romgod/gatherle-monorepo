'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button, Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { MobileDeviceAccessStatus } from '@/data/graphql/types/graphql';
import { ReadMobileDeviceAccessesDocument } from '@/data/graphql/query/MobileDeviceAccess/query';
import { UpdateMobileDeviceAccessStatusDocument } from '@/data/graphql/mutation/MobileDeviceAccess/mutation';
import { useAppContext } from '@/hooks/useAppContext';
import {
  ADMIN_SURFACE_SX,
  AdminEmptyState,
  AdminListSearchField,
  AdminSectionHeader,
} from '@/components/admin/admin-ui';

type DeviceQueue = 'all' | MobileDeviceAccessStatus;

const DEVICE_PAGE_FILTERS: Array<{ value: DeviceQueue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: MobileDeviceAccessStatus.Approved, label: 'Open' },
  { value: MobileDeviceAccessStatus.Blocked, label: 'Blocked' },
  { value: MobileDeviceAccessStatus.Pending, label: 'Pending (legacy)' },
];

function buildDeviceQueryInput(searchQuery: string, queue: DeviceQueue) {
  const trimmedQuery = searchQuery.trim();

  return {
    ...(queue !== 'all' ? { status: queue } : {}),
    ...(trimmedQuery.length >= 2 ? { search: trimmedQuery } : {}),
  };
}

function getStatusChipColor(status: MobileDeviceAccessStatus): 'default' | 'success' | 'warning' | 'error' {
  if (status === MobileDeviceAccessStatus.Approved) {
    return 'success';
  }

  if (status === MobileDeviceAccessStatus.Blocked) {
    return 'error';
  }

  return 'warning';
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function getLinkedUserLabel(user: {
  email?: string | null;
  family_name?: string | null;
  given_name?: string | null;
  userId?: string | null;
  username?: string | null;
}) {
  const fullName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();

  if (fullName) {
    return fullName;
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return user.email ?? user.userId ?? 'Unknown user';
}

function formatLinkedUsers(
  users:
    | Array<{
        email?: string | null;
        family_name?: string | null;
        given_name?: string | null;
        userId?: string | null;
        username?: string | null;
      }>
    | null
    | undefined,
  userIds?: string[] | null,
) {
  if (!users?.length) {
    return userIds?.length ? userIds.slice(0, 2).join(', ') : '—';
  }

  const labels = users.map((user) => getLinkedUserLabel(user));

  if (labels.length <= 2) {
    return labels.join(', ');
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`;
}

export default function AdminDevicesSection({ token }: AdminSectionProps) {
  const { setToastProps } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeQueue, setActiveQueue] = useState<DeviceQueue>('all');
  const [savingDeviceId, setSavingDeviceId] = useState<string | null>(null);
  const queryInput = useMemo(
    () => buildDeviceQueryInput(debouncedSearchQuery, activeQueue),
    [activeQueue, debouncedSearchQuery],
  );
  const { data, loading, error, refetch } = useQuery(ReadMobileDeviceAccessesDocument, {
    variables: {
      input: queryInput,
    },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  const devices = useMemo(() => data?.readMobileDeviceAccesses ?? [], [data]);
  const [updateMobileDeviceAccessStatus] = useMutation(UpdateMobileDeviceAccessStatusDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const refreshDevices = async () => {
    await refetch({
      input: buildDeviceQueryInput(debouncedSearchQuery, activeQueue),
    });
  };

  const handleUpdateStatus = async (deviceInstallationId: string, status: MobileDeviceAccessStatus) => {
    setSavingDeviceId(deviceInstallationId);

    try {
      await updateMobileDeviceAccessStatus({
        variables: {
          input: {
            deviceInstallationId,
            status,
          },
        },
      });
      await refreshDevices();
      notify(`Device moved to ${status.toLowerCase()}.`);
    } catch {
      notify('Unable to update device access.', 'error');
    } finally {
      setSavingDeviceId(null);
    }
  };

  if (error) {
    return <Typography color="error">Unable to load device access right now.</Typography>;
  }

  return (
    <Stack spacing={3}>
      <AdminSectionHeader
        title="Device access"
        description="Native installs register after first open. The app stays open by default, and you can block or re-open an installation when needed."
        meta={
          <Chip size="small" label={debouncedSearchQuery ? `${devices.length} matches` : `${devices.length} loaded`} />
        }
      />

      <AdminListSearchField
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by installation ID, version, or linked user"
        helperText="Type at least 2 characters to filter the device access list."
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {DEVICE_PAGE_FILTERS.map((queue) => (
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

      {loading && devices.length === 0 ? (
        <Stack spacing={2}>
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} variant="rounded" height={230} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : devices.length === 0 ? (
        <AdminEmptyState
          title={debouncedSearchQuery ? 'No matching devices' : 'No device access records yet'}
          description={
            debouncedSearchQuery
              ? 'Try a different installation ID, app version, build number, or linked user.'
              : 'Native installs will appear here after they first check in.'
          }
        />
      ) : (
        <Stack spacing={2}>
          {devices.map((device) => {
            const lastUserLabel = device.lastSeenUser ? getLinkedUserLabel(device.lastSeenUser) : null;
            const isSaving = savingDeviceId === device.deviceInstallationId;

            return (
              <Card key={device.mobileDeviceAccessId} elevation={0} sx={ADMIN_SURFACE_SX}>
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
                          <SmartphoneRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="subtitle1" fontWeight={800}>
                            {device.deviceInstallationId}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            size="small"
                            color={getStatusChipColor(device.status)}
                            variant={device.status === MobileDeviceAccessStatus.Pending ? 'outlined' : 'filled'}
                            label={device.status}
                          />
                          <Chip size="small" variant="outlined" label={device.platform} />
                          {device.appVersion ? (
                            <Chip size="small" variant="outlined" label={`v${device.appVersion}`} />
                          ) : null}
                          {device.buildVersion ? (
                            <Chip size="small" variant="outlined" label={`Build ${device.buildVersion}`} />
                          ) : null}
                          {lastUserLabel ? (
                            <Chip size="small" variant="outlined" label={`Last user · ${lastUserLabel}`} />
                          ) : null}
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          First seen {formatTimestamp(device.firstSeenAt)}. Last seen{' '}
                          {formatTimestamp(device.lastSeenAt)}.
                        </Typography>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', lg: 'auto' }}>
                        {device.status !== MobileDeviceAccessStatus.Blocked ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            disabled={isSaving}
                            onClick={() => {
                              void handleUpdateStatus(device.deviceInstallationId, MobileDeviceAccessStatus.Blocked);
                            }}
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                          >
                            Block
                          </Button>
                        ) : null}
                        {device.status === MobileDeviceAccessStatus.Blocked ||
                        device.status === MobileDeviceAccessStatus.Pending ? (
                          <Button
                            size="small"
                            variant={device.status === MobileDeviceAccessStatus.Blocked ? 'contained' : 'outlined'}
                            color="success"
                            disabled={isSaving}
                            onClick={() => {
                              void handleUpdateStatus(device.deviceInstallationId, MobileDeviceAccessStatus.Approved);
                            }}
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                          >
                            {device.status === MobileDeviceAccessStatus.Blocked ? 'Re-open' : 'Allow'}
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>

                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <HistoryRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Last authenticated {formatTimestamp(device.lastAuthenticatedAt)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonOutlineRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Linked users: {formatLinkedUsers(device.seenUsers, device.seenUserIds)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {device.reviewedAt
                          ? `Reviewed ${formatTimestamp(device.reviewedAt)} by ${device.reviewedByUserId ?? '—'}`
                          : 'Not reviewed yet'}
                      </Typography>
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
