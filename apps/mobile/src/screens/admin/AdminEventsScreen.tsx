import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { DeleteEventByIdDocument, UpdateEventDocument } from '@data/graphql/mutation/Event/mutation';
import { GetEventsDocument } from '@data/graphql/query/Event/query';
import { EventLifecycleStatus, EventStatus, EventVisibility } from '@data/graphql/types/graphql';
import { useNavigation } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { PageContainer } from '@/components/core/PageContainer';
import { SearchField } from '@/components/core/SearchField';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { InlineButton } from '@/components/core/InlineButton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { getApolloAuthContext } from '@/lib/auth';
import { ADMIN_PAGE_SIZE, AdminEventQueue, buildAdminEventQueryOptions } from '@/lib/admin/queryOptions';
import { formatShortDateTime } from '@/lib/events/formatters';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminEntityListSkeleton } from '@/components/admin/AdminEntityCardSkeleton';
import { AdminListFooter } from '@/components/admin/AdminListFooter';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminPill } from '@/components/admin/AdminPill';
import { typography } from '@/app/theme/typography';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

const EVENT_QUEUE_OPTIONS: { key: AdminEventQueue; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_OPTIONS = Object.values(EventStatus);
const LIFECYCLE_OPTIONS = Object.values(EventLifecycleStatus);
const VISIBILITY_OPTIONS = Object.values(EventVisibility);

type EventModerationState = {
  lifecycleStatus: EventLifecycleStatus;
  status: EventStatus;
  visibility: EventVisibility;
};

export function AdminEventsScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<DetailNavigation>();
  const { showToast } = useAppFeedback();
  const { authToken, isAdmin, isAuthenticated, loading: accessLoading, refetch: refetchAdminAccess } = useAdminAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeQueue, setActiveQueue] = useState<AdminEventQueue>('all');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [moderationState, setModerationState] = useState<EventModerationState>({
    lifecycleStatus: EventLifecycleStatus.Draft,
    status: EventStatus.Upcoming,
    visibility: EventVisibility.Public,
  });
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const query = useQuery(GetEventsDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    variables: {
      options: buildAdminEventQueryOptions(debouncedSearchQuery, ADMIN_PAGE_SIZE, 0, activeQueue),
    },
    ...getApolloAuthContext(authToken),
  });
  const events = query.data?.readEvents ?? [];
  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === editingEventId) ?? null,
    [editingEventId, events],
  );
  const [deleteEventById] = useMutation(DeleteEventByIdDocument, getApolloAuthContext(authToken));
  const [updateEvent] = useMutation(UpdateEventDocument, getApolloAuthContext(authToken));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!query.loading) {
      setHasMore(events.length >= ADMIN_PAGE_SIZE);
    }
  }, [events.length, query.loading]);

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([
      refetchAdminAccess(),
      query.refetch({
        options: buildAdminEventQueryOptions(
          debouncedSearchQuery,
          Math.max(events.length, ADMIN_PAGE_SIZE),
          0,
          activeQueue,
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

    try {
      await query.fetchMore({
        variables: {
          options: buildAdminEventQueryOptions(debouncedSearchQuery, ADMIN_PAGE_SIZE, events.length, activeQueue),
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

      setHasMore(nextBatchCount === ADMIN_PAGE_SIZE);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't load more events.",
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
    resetKey: `${activeQueue}:${debouncedSearchQuery}:${events.length}`,
  });

  const confirmDelete = (eventId: string, title: string) => {
    Alert.alert('Delete event', `Delete ${title}? This action cannot be undone.`, [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          void (async () => {
            try {
              await deleteEventById({ variables: { eventId } });
              await refreshAll();
              showToast({ message: 'Event deleted.', tone: 'success' });
            } catch (error) {
              showToast({
                message: error instanceof Error ? error.message : "We couldn't delete this event.",
                tone: 'error',
              });
            }
          })();
        },
      },
    ]);
  };

  const openModerationModal = (eventId: string) => {
    const event = events.find((entry) => entry.eventId === eventId);
    if (!event) {
      return;
    }

    setEditingEventId(eventId);
    setModerationState({
      lifecycleStatus: event.lifecycleStatus ?? EventLifecycleStatus.Draft,
      status: event.status ?? EventStatus.Upcoming,
      visibility: event.visibility ?? EventVisibility.Public,
    });
  };

  const closeModerationModal = () => {
    setEditingEventId(null);
  };

  const saveModeration = async () => {
    if (!editingEventId) {
      return;
    }

    setSavingEventId(editingEventId);
    try {
      await updateEvent({
        variables: {
          input: {
            eventId: editingEventId,
            lifecycleStatus: moderationState.lifecycleStatus,
            status: moderationState.status,
            visibility: moderationState.visibility,
          },
        },
      });
      await refreshAll();
      setEditingEventId(null);
      showToast({ message: 'Event moderation saved.', tone: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save this event.",
        tone: 'error',
      });
    } finally {
      setSavingEventId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <StateNotice message="Sign in with a Gatherle admin account to moderate events." />
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
        <StateNotice message="Only Gatherle admins can access event moderation." />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        onContentSizeChange={infiniteScroll.onContentSizeChange}
        onRefresh={onRefresh}
        onScroll={infiniteScroll.onScroll}
        refreshing={refreshing}
        scrollEventThrottle={infiniteScroll.scrollEventThrottle}
      >
        <View style={styles.section}>
          <SectionHeading title="Event moderation" />
          <SearchField
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search title, slug, location, category, or org"
            value={searchQuery}
          />
          <View style={styles.filterRow}>
            {EVENT_QUEUE_OPTIONS.map((queue) => (
              <AccountChoiceChip
                key={queue.key}
                label={queue.label}
                onPress={() => setActiveQueue(queue.key)}
                selected={activeQueue === queue.key}
              />
            ))}
          </View>
        </View>

        {query.error && events.length === 0 ? (
          <StateNotice actionLabel="Retry" message="We couldn’t load events." onPressAction={() => void refreshAll()} />
        ) : query.loading && events.length === 0 ? (
          <AdminEntityListSkeleton />
        ) : events.length === 0 ? (
          <StateNotice
            message={
              debouncedSearchQuery ? 'No matching events for that search.' : 'No events available for moderation yet.'
            }
          />
        ) : (
          <View style={styles.list}>
            {events.map((event) => (
              <AdminEntityCard
                key={event.eventId}
                actions={
                  <View style={styles.actionRow}>
                    <InlineButton
                      compact
                      label="Edit"
                      onPress={() => openModerationModal(event.eventId)}
                      tone="secondary"
                    />
                    <InlineButton
                      compact
                      label="Sessions"
                      onPress={() =>
                        navigation.navigate('AdminEventSessions', { eventId: event.eventId, title: event.title })
                      }
                      tone="neutral"
                    />
                    <InlineButton
                      compact
                      label="Delete"
                      onPress={() => confirmDelete(event.eventId, event.title)}
                      tone="primary"
                    />
                  </View>
                }
                description={event.summary}
                meta={
                  <>
                    <AdminPill label={`Status · ${event.status ?? EventStatus.Upcoming}`} tone="primary" />
                    <AdminPill
                      label={`Lifecycle · ${event.lifecycleStatus ?? EventLifecycleStatus.Draft}`}
                      tone="default"
                    />
                    {event.visibility ? <AdminPill label={`Visibility · ${event.visibility}`} tone="default" /> : null}
                    <AdminPill label={`${event.rsvpCount ?? 0} RSVPs`} tone="success" />
                    <AdminPill label={`${event.savedByCount ?? 0} saves`} tone="default" />
                  </>
                }
                subtitle={
                  event.representativeOccurrence
                    ? formatShortDateTime(event.representativeOccurrence.startAt)
                    : (event.primarySchedule?.recurrenceRule ?? null)
                }
                title={event.title}
              >
                {event.organization?.name ? (
                  <Text style={[styles.metaText, { color: theme.colors.primaryContrast }]}>
                    Organization: {event.organization.name}
                  </Text>
                ) : null}
                {event.location?.address?.city || event.location?.address?.country ? (
                  <Text style={[styles.metaText, { color: theme.colors.primaryContrast }]}>
                    {[event.location.address?.city, event.location.address?.state, event.location.address?.country]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                ) : null}
              </AdminEntityCard>
            ))}

            <AdminListFooter hasMore={hasMore} label="event" loadedCount={events.length} loadingMore={loadingMore} />
          </View>
        )}
      </PageContainer>

      <AdminModal
        footer={
          <>
            <AccountPrimaryButton label="Cancel" onPress={closeModerationModal} tone="secondary" />
            <AccountPrimaryButton
              icon="save"
              label="Save moderation"
              loading={Boolean(savingEventId)}
              onPress={() => void saveModeration()}
            />
          </>
        }
        onClose={closeModerationModal}
        title={selectedEvent ? `Moderate ${selectedEvent.title}` : 'Moderate event'}
        visible={Boolean(selectedEvent)}
      >
        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Status</Text>
          <View style={styles.filterRow}>
            {STATUS_OPTIONS.map((status) => (
              <AccountChoiceChip
                key={status}
                label={status}
                onPress={() => setModerationState((current) => ({ ...current, status }))}
                selected={moderationState.status === status}
              />
            ))}
          </View>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Lifecycle</Text>
          <View style={styles.filterRow}>
            {LIFECYCLE_OPTIONS.map((lifecycleStatus) => (
              <AccountChoiceChip
                key={lifecycleStatus}
                label={lifecycleStatus}
                onPress={() => setModerationState((current) => ({ ...current, lifecycleStatus }))}
                selected={moderationState.lifecycleStatus === lifecycleStatus}
              />
            ))}
          </View>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Visibility</Text>
          <View style={styles.filterRow}>
            {VISIBILITY_OPTIONS.map((visibility) => (
              <AccountChoiceChip
                key={visibility}
                label={visibility}
                onPress={() => setModerationState((current) => ({ ...current, visibility }))}
                selected={moderationState.visibility === visibility}
              />
            ))}
          </View>
        </View>
      </AdminModal>
    </>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 14,
  },
  metaText: {
    ...typography.bodyRegular,
    fontSize: 13,
  },
  modalLabel: {
    ...typography.bodySemiBold,
    fontSize: 14,
  },
  modalSection: {
    gap: 10,
  },
  section: {
    gap: 14,
  },
});
