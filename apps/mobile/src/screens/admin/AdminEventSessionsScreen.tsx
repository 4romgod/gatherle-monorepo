import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { SplitEventSeriesAtOccurrenceDocument } from '@data/graphql/mutation/Event/mutation';
import { CancelEventOccurrenceDocument } from '@data/graphql/mutation/EventOccurrence/mutation';
import { GetEventOccurrencesDocument } from '@data/graphql/query/EventOccurrence/query';
import { EventOccurrenceStatus } from '@data/graphql/types/graphql';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/app/navigation/routes';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { InlineButton } from '@/components/core/InlineButton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { getApolloAuthContext } from '@/lib/auth';
import {
  ADMIN_OCCURRENCE_LOOKAHEAD_DAYS,
  ADMIN_OCCURRENCE_LOOKBACK_DAYS,
  ADMIN_PAGE_SIZE,
  buildAdminEventOccurrenceQueryOptions,
  getAdminOccurrenceTone,
  getAdminOccurrenceWindow,
} from '@/lib/admin/queryOptions';
import { formatShortDate, formatShortDateTime } from '@/lib/events/formatters';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminEntityListSkeleton } from '@/components/admin/AdminEntityCardSkeleton';
import { AdminListFooter } from '@/components/admin/AdminListFooter';
import { AdminPill } from '@/components/admin/AdminPill';
import { typography } from '@/app/theme/typography';

type AdminEventSessionsRoute = RouteProp<RootStackParamList, 'AdminEventSessions'>;

export function AdminEventSessionsScreen() {
  const route = useRoute<AdminEventSessionsRoute>();
  const navigation = useNavigation();
  const { showToast } = useAppFeedback();
  const { authToken, isAdmin, isAuthenticated, loading: accessLoading, refetch: refetchAdminAccess } = useAdminAccess();
  const { eventId, title } = route.params;
  const occurrenceWindow = useMemo(() => getAdminOccurrenceWindow(), []);
  const query = useQuery(GetEventOccurrencesDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    variables: {
      options: buildAdminEventOccurrenceQueryOptions(eventId, occurrenceWindow, ADMIN_PAGE_SIZE, 0),
    },
    ...getApolloAuthContext(authToken),
  });
  const occurrences = query.data?.readEventOccurrences ?? [];
  const totalCount = query.data?.readEventOccurrencesCount ?? occurrences.length;
  const [cancelOccurrence] = useMutation(CancelEventOccurrenceDocument, getApolloAuthContext(authToken));
  const [splitEventSeriesAtOccurrence] = useMutation(
    SplitEventSeriesAtOccurrenceDocument,
    getApolloAuthContext(authToken),
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!query.loading) {
      setHasMore(occurrences.length < totalCount);
    }
  }, [occurrences.length, query.loading, totalCount]);

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([
      refetchAdminAccess(),
      query.refetch({
        options: buildAdminEventOccurrenceQueryOptions(
          eventId,
          occurrenceWindow,
          Math.max(occurrences.length, ADMIN_PAGE_SIZE),
          0,
        ),
      }),
    ]);
  };

  const { onRefresh, refreshing } = usePullToRefresh(refreshAll);

  const loadMore = async () => {
    if (query.loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    let nextBatchCount = 0;
    let nextTotalCount = totalCount;

    try {
      await query.fetchMore({
        variables: {
          options: buildAdminEventOccurrenceQueryOptions(
            eventId,
            occurrenceWindow,
            ADMIN_PAGE_SIZE,
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
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't load more sessions.",
        tone: 'error',
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const infiniteScroll = useInfiniteScroll({
    enabled: hasMore,
    loading: query.loading || loadingMore,
    onEndReached: loadMore,
    resetKey: `${eventId}:${occurrences.length}`,
  });

  const promptCancel = (occurrenceId: string, label: string) => {
    Alert.alert('Cancel session', `Cancel ${label}?`, [
      { style: 'cancel', text: 'Keep session' },
      {
        style: 'destructive',
        text: 'Cancel session',
        onPress: () => {
          void (async () => {
            try {
              await cancelOccurrence({ variables: { input: { occurrenceId } } });
              await refreshAll();
              showToast({ message: 'Session cancelled.', tone: 'success' });
            } catch (error) {
              showToast({
                message: error instanceof Error ? error.message : "We couldn't cancel this session.",
                tone: 'error',
              });
            }
          })();
        },
      },
    ]);
  };

  const promptSplit = (occurrenceId: string, label: string) => {
    Alert.alert('Split future sessions', `Split the series at ${label}? Future sessions will move into a new series.`, [
      { style: 'cancel', text: 'Cancel' },
      {
        text: 'Split',
        onPress: () => {
          void (async () => {
            try {
              await splitEventSeriesAtOccurrence({ variables: { input: { occurrenceId } } });
              showToast({ message: 'Future sessions split into a new series.', tone: 'success' });
              navigation.goBack();
            } catch (error) {
              showToast({
                message: error instanceof Error ? error.message : "We couldn't split this series.",
                tone: 'error',
              });
            }
          })();
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <StateNotice message="Sign in with a Gatherle admin account to manage sessions." />
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
        <StateNotice message="Only Gatherle admins can access session operations." />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      onContentSizeChange={infiniteScroll.onContentSizeChange}
      onRefresh={onRefresh}
      onScroll={infiniteScroll.onScroll}
      refreshing={refreshing}
      scrollEventThrottle={infiniteScroll.scrollEventThrottle}
    >
      <View style={styles.section}>
        <SectionHeading title={title ?? 'Event sessions'} />
        <Text style={styles.helperText}>
          Showing the last {ADMIN_OCCURRENCE_LOOKBACK_DAYS} days and the next{' '}
          {Math.floor(ADMIN_OCCURRENCE_LOOKAHEAD_DAYS / 30)} months of generated sessions for this event series.
        </Text>
      </View>

      {query.error && occurrences.length === 0 ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load event sessions."
          onPressAction={() => void refreshAll()}
        />
      ) : query.loading && occurrences.length === 0 ? (
        <AdminEntityListSkeleton />
      ) : occurrences.length === 0 ? (
        <StateNotice message="No generated sessions are available in the current operational window." />
      ) : (
        <View style={styles.list}>
          {occurrences.map((occurrence) => {
            const label = formatShortDateTime(occurrence.startAt);
            return (
              <AdminEntityCard
                key={occurrence.occurrenceId}
                actions={
                  <View style={styles.actionRow}>
                    {occurrence.status !== EventOccurrenceStatus.Cancelled ? (
                      <InlineButton
                        compact
                        label="Cancel session"
                        onPress={() => promptCancel(occurrence.occurrenceId, label)}
                        tone="neutral"
                      />
                    ) : null}
                    <InlineButton
                      compact
                      label="Split future"
                      onPress={() => promptSplit(occurrence.occurrenceId, label)}
                      tone="secondary"
                    />
                  </View>
                }
                meta={
                  <>
                    <AdminPill label={occurrence.status} tone={getAdminOccurrenceTone(occurrence.status)} />
                    {occurrence.isException ? <AdminPill label="Exception" tone="default" /> : null}
                    <AdminPill label={`${occurrence.rsvpCount ?? 0} RSVPs`} tone="success" />
                  </>
                }
                subtitle={formatShortDate(occurrence.startAt)}
                title={label}
              >
                <Text style={styles.helperText}>
                  {occurrence.eventSeries?.organization?.name ?? 'Standalone event'}
                  {occurrence.timezone ? ` · ${occurrence.timezone}` : ''}
                </Text>
              </AdminEntityCard>
            );
          })}

          <AdminListFooter
            hasMore={hasMore}
            label="session"
            loadedCount={occurrences.length}
            loadingMore={loadingMore}
          />
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: 13,
  },
  list: {
    gap: 14,
  },
  section: {
    gap: 10,
  },
});
