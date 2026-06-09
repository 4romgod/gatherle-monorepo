import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { UpdateMobileDeviceAccessStatusDocument } from '@data/graphql/mutation/MobileDeviceAccess/mutation';
import { ReadMobileDeviceAccessesDocument } from '@data/graphql/query/MobileDeviceAccess/query';
import { MobileDeviceAccessStatus } from '@data/graphql/types/graphql';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminPill } from '@/components/admin/AdminPill';
import { PageContainer } from '@/components/core/PageContainer';
import { SearchField } from '@/components/core/SearchField';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { InlineButton } from '@/components/core/InlineButton';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { getApolloAuthContext } from '@/lib/auth';

type DeviceQueue = 'all' | MobileDeviceAccessStatus;

const DEVICE_QUEUE_OPTIONS: Array<{ key: DeviceQueue; label: string }> = [
  { key: 'all', label: 'All' },
  { key: MobileDeviceAccessStatus.Approved, label: 'Open' },
  { key: MobileDeviceAccessStatus.Blocked, label: 'Blocked' },
  { key: MobileDeviceAccessStatus.Pending, label: 'Pending (legacy)' },
];

function getLinkedUserLabel(user: {
  email?: string | null;
  family_name?: string | null;
  given_name?: string | null;
  userId?: string | null;
  username?: string | null;
}) {
  const name = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
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
): string {
  if (!users?.length) {
    return userIds?.length ? userIds.slice(0, 2).join(', ') : '-';
  }

  const labels = users.map((user) => getLinkedUserLabel(user));
  if (labels.length <= 2) {
    return labels.join(', ');
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`;
}

function formatTimestamp(value?: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

function getStatusTone(status: MobileDeviceAccessStatus): React.ComponentProps<typeof AdminPill>['tone'] {
  if (status === MobileDeviceAccessStatus.Approved) {
    return 'success';
  }

  if (status === MobileDeviceAccessStatus.Blocked) {
    return 'error';
  }

  return 'primary';
}

export function AdminDevicesScreen() {
  const { theme } = useAppTheme();
  const { showToast } = useAppFeedback();
  const { authToken, isAdmin, isAuthenticated, loading: accessLoading, refetch: refetchAdminAccess } = useAdminAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeQueue, setActiveQueue] = useState<DeviceQueue>('all');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const queryInput = useMemo(
    () => ({
      ...(activeQueue !== 'all' ? { status: activeQueue } : {}),
      ...(debouncedSearchQuery ? { search: debouncedSearchQuery } : {}),
    }),
    [activeQueue, debouncedSearchQuery],
  );

  const query = useQuery(ReadMobileDeviceAccessesDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    variables: {
      input: queryInput,
    },
    ...getApolloAuthContext(authToken),
  });
  const [updateMobileDeviceAccessStatus] = useMutation(
    UpdateMobileDeviceAccessStatusDocument,
    getApolloAuthContext(authToken),
  );
  const devices = query.data?.readMobileDeviceAccesses ?? [];

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([
      refetchAdminAccess(),
      query.refetch({
        input: queryInput,
      }),
    ]);
  };

  const { onRefresh, refreshing } = usePullToRefresh(refreshAll);

  const handleUpdateStatus = async (deviceInstallationId: string, status: MobileDeviceAccessStatus) => {
    try {
      await updateMobileDeviceAccessStatus({
        variables: {
          input: {
            deviceInstallationId,
            status,
          },
        },
      });
      await query.refetch({
        input: queryInput,
      });
      showToast({
        message: `Device moved to ${status.toLowerCase()}.`,
        tone: 'success',
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't update this device.",
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <StateNotice message="Sign in with a Gatherle admin account to manage device access." />
      </PageContainer>
    );
  }

  if (accessLoading && !isAdmin) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice message="Checking your admin access..." />
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice message="Only Gatherle admins can manage device access." />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.section}>
        <SectionHeading title="Device access" />
        <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
          Native installs register here after first open. The app stays available by default, and you can block or
          re-open an installation when needed while still seeing linked signed-in accounts and recency.
        </Text>
        <SearchField
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search installation ID, version, or user ID"
          value={searchQuery}
        />
        <View style={styles.filterRow}>
          {DEVICE_QUEUE_OPTIONS.map((queue) => (
            <AccountChoiceChip
              key={queue.key}
              label={queue.label}
              onPress={() => setActiveQueue(queue.key)}
              selected={activeQueue === queue.key}
            />
          ))}
        </View>
      </View>

      {query.error && devices.length === 0 ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn't load device access records."
          onPressAction={() => void refreshAll()}
          tone="error"
        />
      ) : query.loading && devices.length === 0 ? (
        <StateNotice message="Loading device access records..." />
      ) : devices.length === 0 ? (
        <StateNotice
          message={
            debouncedSearchQuery
              ? 'No device access records matched that search.'
              : 'No native installations have checked in yet.'
          }
        />
      ) : (
        <View style={styles.list}>
          {devices.map((device) => (
            <AdminEntityCard
              key={device.mobileDeviceAccessId}
              actions={
                <View style={styles.cardActions}>
                  {device.status !== MobileDeviceAccessStatus.Blocked ? (
                    <InlineButton
                      compact
                      label="Block"
                      onPress={() => {
                        void handleUpdateStatus(device.deviceInstallationId, MobileDeviceAccessStatus.Blocked);
                      }}
                      tone="secondary"
                    />
                  ) : null}
                  {device.status === MobileDeviceAccessStatus.Blocked ||
                  device.status === MobileDeviceAccessStatus.Pending ? (
                    <InlineButton
                      compact
                      label={device.status === MobileDeviceAccessStatus.Blocked ? 'Re-open' : 'Allow'}
                      onPress={() => {
                        void handleUpdateStatus(device.deviceInstallationId, MobileDeviceAccessStatus.Approved);
                      }}
                      tone="primary"
                    />
                  ) : null}
                </View>
              }
              description={`First seen ${formatTimestamp(device.firstSeenAt)}. Last seen ${formatTimestamp(device.lastSeenAt)}.`}
              meta={
                <>
                  <AdminPill label={device.status} tone={getStatusTone(device.status)} />
                  <AdminPill label={device.platform} />
                  {device.appVersion ? <AdminPill label={`v${device.appVersion}`} /> : null}
                  {device.buildVersion ? <AdminPill label={`build ${device.buildVersion}`} /> : null}
                  {device.lastSeenUser ? (
                    <AdminPill label={`Last user · ${getLinkedUserLabel(device.lastSeenUser)}`} tone="default" />
                  ) : null}
                </>
              }
              subtitle={device.reviewedAt ? `Reviewed ${formatTimestamp(device.reviewedAt)}` : 'Not reviewed yet'}
              title={device.deviceInstallationId}
            >
              <View style={styles.metaBlock}>
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  Last authenticated: {formatTimestamp(device.lastAuthenticatedAt)}
                </Text>
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  Linked users: {formatLinkedUsers(device.seenUsers, device.seenUserIds)}
                </Text>
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  Reviewed by: {device.reviewedByUserId ?? '-'}
                </Text>
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  Record updated: {formatTimestamp(device.updatedAt)}
                </Text>
              </View>
            </AdminEntityCard>
          ))}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  metaBlock: {
    gap: 6,
  },
  metaText: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
});
