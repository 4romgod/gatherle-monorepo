import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { UpdateSupportRequestStatusDocument } from '@data/graphql/mutation/SupportRequest/mutation';
import { ReadSupportRequestsDocument } from '@data/graphql/query/SupportRequest/query';
import { SupportRequestKind, SupportRequestStatus } from '@data/graphql/types/graphql';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { PageContainer } from '@/components/core/PageContainer';
import { SearchField } from '@/components/core/SearchField';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { InlineButton } from '@/components/core/InlineButton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { getApolloAuthContext } from '@/lib/auth';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminEntityListSkeleton } from '@/components/admin/AdminEntityCardSkeleton';
import { AdminListFooter } from '@/components/admin/AdminListFooter';
import { AdminPill } from '@/components/admin/AdminPill';
import { typography } from '@/app/theme/typography';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type SupportQueue = 'all' | SupportRequestStatus;

const SUPPORT_QUEUE_OPTIONS: Array<{ key: SupportQueue; label: string }> = [
  { key: 'all', label: 'All' },
  { key: SupportRequestStatus.Open, label: 'Open' },
  { key: SupportRequestStatus.Resolved, label: 'Resolved' },
];

function buildSupportRequestQueryInput(searchQuery: string, queue: SupportQueue) {
  const trimmedQuery = searchQuery.trim();

  return {
    ...(queue !== 'all' ? { status: queue } : {}),
    ...(trimmedQuery.length >= 2 ? { search: trimmedQuery } : {}),
    limit: 100,
  };
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

export function AdminSupportRequestsScreen() {
  const { theme } = useAppTheme();
  const { showToast } = useAppFeedback();
  const { authToken, isAdmin, isAuthenticated, loading: accessLoading, refetch: refetchAdminAccess } = useAdminAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeQueue, setActiveQueue] = useState<SupportQueue>('all');
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  const query = useQuery(ReadSupportRequestsDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    variables: {
      input: buildSupportRequestQueryInput(debouncedSearchQuery, activeQueue),
    },
    ...getApolloAuthContext(authToken),
  });
  const supportRequests = query.data?.readSupportRequests ?? [];
  const [updateSupportRequestStatus] = useMutation(UpdateSupportRequestStatusDocument, getApolloAuthContext(authToken));

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([
      refetchAdminAccess(),
      query.refetch({
        input: buildSupportRequestQueryInput(debouncedSearchQuery, activeQueue),
      }),
    ]);
  };

  const { onRefresh, refreshing } = usePullToRefresh(refreshAll);

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
      await refreshAll();
      showToast({ message: `Request moved to ${status.toLowerCase()}.`, tone: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't update this request.",
        tone: 'error',
      });
    } finally {
      setSavingRequestId(null);
    }
  };

  const openScreenshot = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      showToast({ message: "We couldn't open that screenshot.", tone: 'error' });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <StateNotice message="Sign in with an admin account to view support requests." />
      </PageContainer>
    );
  }

  if (accessLoading && !isAdmin) {
    return (
      <PageContainer>
        <StateNotice message="Checking your admin access..." />
      </PageContainer>
    );
  }

  if (!isAdmin || !authToken) {
    return (
      <PageContainer>
        <StateNotice message="Only Gatherle admins can access support requests." />
      </PageContainer>
    );
  }

  if (query.error) {
    return (
      <PageContainer>
        <StateNotice message="We couldn't load support requests right now." />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.section}>
        <SectionHeading title="Support inbox" />
        <SearchField
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search by email, subject, route, or message"
          value={searchQuery}
        />
        <View style={styles.choiceRow}>
          {SUPPORT_QUEUE_OPTIONS.map((option) => (
            <AccountChoiceChip
              key={option.key}
              label={option.label}
              onPress={() => setActiveQueue(option.key)}
              selected={activeQueue === option.key}
            />
          ))}
        </View>
      </View>

      {query.loading && supportRequests.length === 0 ? (
        <AdminEntityListSkeleton count={4} />
      ) : supportRequests.length === 0 ? (
        <StateNotice
          message={
            debouncedSearchQuery
              ? 'No support requests match that search.'
              : 'No support requests have been submitted yet.'
          }
        />
      ) : (
        <View style={styles.list}>
          {supportRequests.map((supportRequest) => {
            const isSaving = savingRequestId === supportRequest.supportRequestId;
            const nextStatus =
              supportRequest.status === SupportRequestStatus.Open
                ? SupportRequestStatus.Resolved
                : SupportRequestStatus.Open;
            const screenshotUrl = supportRequest.screenshotUrl;

            return (
              <AdminEntityCard
                key={supportRequest.supportRequestId}
                actions={
                  <InlineButton
                    compact
                    label={
                      isSaving
                        ? 'Saving...'
                        : supportRequest.status === SupportRequestStatus.Open
                          ? 'Resolve'
                          : 'Reopen'
                    }
                    onPress={() => void handleUpdateStatus(supportRequest.supportRequestId, nextStatus)}
                  />
                }
                description={supportRequest.message}
                meta={
                  <>
                    <AdminPill label={getKindLabel(supportRequest.kind)} tone="primary" />
                    <AdminPill
                      label={supportRequest.status}
                      tone={supportRequest.status === SupportRequestStatus.Resolved ? 'success' : 'default'}
                    />
                    {supportRequest.platform ? <AdminPill label={supportRequest.platform} /> : null}
                  </>
                }
                subtitle={`${supportRequest.requesterEmail} • ${formatTimestamp(supportRequest.createdAt)}`}
                title={supportRequest.subject}
              >
                <View style={styles.metaBlock}>
                  {supportRequest.pagePath ? (
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                      Route: {supportRequest.pagePath}
                    </Text>
                  ) : null}
                  {supportRequest.appVersion ? (
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                      App: {supportRequest.appVersion}
                      {supportRequest.buildVersion ? ` (${supportRequest.buildVersion})` : ''}
                    </Text>
                  ) : null}
                </View>

                {screenshotUrl ? (
                  <InlineButton
                    compact
                    label="Open screenshot"
                    onPress={() => void openScreenshot(screenshotUrl)}
                    tone="neutral"
                  />
                ) : (
                  <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>No screenshot attached.</Text>
                )}
              </AdminEntityCard>
            );
          })}

          <AdminListFooter hasMore={false} label="request" loadedCount={supportRequests.length} />
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 12,
  },
  metaBlock: {
    gap: 6,
  },
  metaText: {
    ...typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
});
