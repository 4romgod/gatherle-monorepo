import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery } from '@apollo/client';
import { SplitEventSeriesAtOccurrenceDocument } from '@data/graphql/mutation/Event/mutation';
import {
  CancelEventOccurrenceDocument,
  UpdateEventOccurrenceDocument,
} from '@data/graphql/mutation/EventOccurrence/mutation';
import { GetEventOccurrencesDocument } from '@data/graphql/query/EventOccurrence/query';
import { EventOccurrenceStatus, ParticipantStatus, type GetEventOccurrencesQuery } from '@data/graphql/types/graphql';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminEntityListSkeleton } from '@/components/admin/AdminEntityCardSkeleton';
import { AdminListFooter } from '@/components/admin/AdminListFooter';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminPill } from '@/components/admin/AdminPill';
import { DatePickerField } from '@/components/core/DatePickerField';
import { InlineButton } from '@/components/core/InlineButton';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useEventManagementAccess } from '@/hooks/events/useEventManagementAccess';
import { getApolloAuthContext } from '@/lib/auth';
import {
  ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS,
  ORGANIZER_OCCURRENCE_LOOKBACK_DAYS,
  ORGANIZER_OCCURRENCE_PAGE_SIZE,
  buildIsoFromTimeZoneDateAndTime,
  buildOccurrenceParticipantBreakdown,
  buildOrganizerOccurrenceQueryOptions,
  formatDateInputInTimeZone,
  formatTimeInputInTimeZone,
  getOrganizerOccurrenceTone,
  getOrganizerOccurrenceWindow,
} from '@/lib/events/organizerSessions';
import { formatShortDate, formatShortDateTime } from '@/lib/events/formatters';

type OrganizerEventSessionsRoute = RouteProp<RootStackParamList, 'OrganizerEventSessions'>;

type OrganizerOccurrence = NonNullable<GetEventOccurrencesQuery['readEventOccurrences']>[number];
type OrganizerOccurrenceParticipant = NonNullable<OrganizerOccurrence['participants']>[number];

type EditableOccurrenceState = {
  endDate: string;
  endTime: string;
  label: string;
  occurrenceId: string;
  startDate: string;
  startTime: string;
  timezone: string;
};

function getParticipantLabel(participant: OrganizerOccurrenceParticipant, index: number) {
  const user = participant.user;
  if (!user) {
    return `Participant ${index + 1}`;
  }

  const fullName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  return fullName || (user.username ? `@${user.username}` : `Participant ${index + 1}`);
}

function getParticipantMeta(participant: OrganizerOccurrenceParticipant) {
  const statusLabel = participant.status === ParticipantStatus.CheckedIn ? 'Checked in' : participant.status;
  return participant.quantity && participant.quantity > 1
    ? `${statusLabel} · ${participant.quantity} spots`
    : statusLabel;
}

export function OrganizerEventSessionsScreen() {
  const route = useRoute<OrganizerEventSessionsRoute>();
  const navigation = useNavigation<DetailNavigation>();
  const { showToast } = useAppFeedback();
  const { authToken, isAuthenticated } = useAppShell();
  const { theme } = useAppTheme();
  const { eventId, initialAction, initialOccurrenceId, title } = route.params;
  const occurrenceWindow = useMemo(() => getOrganizerOccurrenceWindow(), []);
  const query = useQuery(GetEventOccurrencesDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken,
    variables: {
      options: buildOrganizerOccurrenceQueryOptions(eventId, occurrenceWindow, ORGANIZER_OCCURRENCE_PAGE_SIZE, 0),
    },
    ...getApolloAuthContext(authToken),
  });

  const occurrences = query.data?.readEventOccurrences ?? [];
  const totalCount = query.data?.readEventOccurrencesCount ?? occurrences.length;
  const { canManageEvent, loading: eventManagementLoading } = useEventManagementAccess(
    occurrences[0]?.eventSeries ?? null,
  );

  const [cancelOccurrence] = useMutation(CancelEventOccurrenceDocument, getApolloAuthContext(authToken));
  const [updateOccurrence] = useMutation(UpdateEventOccurrenceDocument, getApolloAuthContext(authToken));
  const [splitEventSeriesAtOccurrence] = useMutation(
    SplitEventSeriesAtOccurrenceDocument,
    getApolloAuthContext(authToken),
  );

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<string | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<EditableOccurrenceState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialActionHandled, setInitialActionHandled] = useState(false);

  useEffect(() => {
    if (!query.loading) {
      setHasMore(occurrences.length < totalCount);
    }
  }, [occurrences.length, query.loading, totalCount]);

  useEffect(() => {
    setInitialActionHandled(false);
  }, [eventId, initialAction, initialOccurrenceId]);

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken) {
      return;
    }

    const requestedLimit = Math.max(occurrences.length, ORGANIZER_OCCURRENCE_PAGE_SIZE);
    const result = await query.refetch({
      options: buildOrganizerOccurrenceQueryOptions(eventId, occurrenceWindow, requestedLimit, 0),
    });
    const refreshedOccurrences = result.data?.readEventOccurrences ?? [];
    const refreshedTotalCount = result.data?.readEventOccurrencesCount ?? refreshedOccurrences.length;
    setHasMore(refreshedOccurrences.length < refreshedTotalCount);
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
          options: buildOrganizerOccurrenceQueryOptions(
            eventId,
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

  const openEditModal = (occurrence: (typeof occurrences)[number]) => {
    setFormError(null);
    setEditingOccurrence({
      endDate: formatDateInputInTimeZone(occurrence.endAt, occurrence.timezone),
      endTime: formatTimeInputInTimeZone(occurrence.endAt, occurrence.timezone),
      label: formatShortDateTime(occurrence.startAt),
      occurrenceId: occurrence.occurrenceId,
      startDate: formatDateInputInTimeZone(occurrence.startAt, occurrence.timezone),
      startTime: formatTimeInputInTimeZone(occurrence.startAt, occurrence.timezone),
      timezone: occurrence.timezone,
    });
  };

  const saveEdit = async () => {
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
      await updateOccurrence({
        variables: {
          input: {
            occurrenceId: editingOccurrence.occurrenceId,
            startAt,
            endAt,
          },
        },
      });

      await refreshAll();
      setEditingOccurrence(null);
      showToast({ message: 'Session updated.', tone: 'success' });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn't update this session.");
    } finally {
      setSavingEdit(false);
    }
  };

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
              const result = await splitEventSeriesAtOccurrence({ variables: { input: { occurrenceId } } });
              const nextSeries = result.data?.splitEventSeriesAtOccurrence;
              showToast({ message: 'Future sessions split into a new series.', tone: 'success' });

              if (nextSeries?.eventId) {
                navigation.dispatch(
                  StackActions.replace('OrganizerEventSessions', {
                    eventId: nextSeries.eventId,
                    title: nextSeries.title ?? title,
                  }),
                );
                return;
              }

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

  useEffect(() => {
    if (initialActionHandled || !initialOccurrenceId || query.loading) {
      return;
    }

    const targetOccurrence = occurrences.find((candidate) => candidate.occurrenceId === initialOccurrenceId);

    if (!targetOccurrence) {
      if (!query.loading) {
        setInitialActionHandled(true);
      }
      return;
    }

    setInitialActionHandled(true);
    setExpandedOccurrenceId(targetOccurrence.occurrenceId);

    if (initialAction === 'edit') {
      openEditModal(targetOccurrence);
      return;
    }

    if (initialAction === 'cancel') {
      promptCancel(targetOccurrence.occurrenceId, formatShortDateTime(targetOccurrence.startAt));
    }
  }, [initialAction, initialActionHandled, initialOccurrenceId, occurrences, query.loading]);

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <StateNotice message="Sign in to manage the sessions for events that you can manage." />
      </PageContainer>
    );
  }

  if (!query.loading && !eventManagementLoading && occurrences.length > 0 && !canManageEvent) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice message="Only Gatherle admins and the linked organization event managers can manage these sessions." />
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
          <SectionHeading title={title ?? 'Sessions'} />
          <Text style={styles.helperText}>
            Showing the last {ORGANIZER_OCCURRENCE_LOOKBACK_DAYS} days and the next{' '}
            {Math.floor(ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS / 30)} months of generated sessions for this event series.
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
              const isScheduled = occurrence.status === EventOccurrenceStatus.Scheduled;
              const label = formatShortDateTime(occurrence.startAt);
              const breakdown = buildOccurrenceParticipantBreakdown(occurrence.participants);
              const isExpanded = expandedOccurrenceId === occurrence.occurrenceId;

              return (
                <AdminEntityCard
                  key={occurrence.occurrenceId}
                  actions={
                    <View style={styles.actionRow}>
                      {isScheduled ? (
                        <>
                          <InlineButton
                            compact
                            label="Edit session"
                            onPress={() => openEditModal(occurrence)}
                            tone="secondary"
                          />
                          <InlineButton
                            compact
                            label="Split future"
                            onPress={() => promptSplit(occurrence.occurrenceId, label)}
                            tone="secondary"
                          />
                          <InlineButton
                            compact
                            label="Cancel session"
                            onPress={() => promptCancel(occurrence.occurrenceId, label)}
                            tone="neutral"
                          />
                        </>
                      ) : null}
                    </View>
                  }
                  meta={
                    <>
                      <AdminPill label={occurrence.status} tone={getOrganizerOccurrenceTone(occurrence.status)} />
                      {occurrence.isException ? <AdminPill label="Exception" tone="default" /> : null}
                      <AdminPill label={`${occurrence.rsvpCount ?? 0} RSVPs`} tone="success" />
                      {breakdown.going > 0 ? <AdminPill label={`${breakdown.going} going`} tone="default" /> : null}
                      {breakdown.checkedIn > 0 ? (
                        <AdminPill label={`${breakdown.checkedIn} checked in`} tone="success" />
                      ) : null}
                      {breakdown.interested > 0 ? (
                        <AdminPill label={`${breakdown.interested} interested`} tone="default" />
                      ) : null}
                      {breakdown.waitlisted > 0 ? (
                        <AdminPill label={`${breakdown.waitlisted} waitlisted`} tone="error" />
                      ) : null}
                    </>
                  }
                  subtitle={formatShortDate(occurrence.startAt)}
                  title={label}
                >
                  <Text style={styles.helperText}>
                    {occurrence.timezone ? `${occurrence.timezone}` : 'Timezone pending'}
                    {occurrence.endAt ? ` · ends ${formatShortDateTime(occurrence.endAt)}` : ''}
                  </Text>

                  <View style={styles.attendeeSection}>
                    <InlineButton
                      compact
                      label={isExpanded ? 'Hide attendees' : 'Show attendees'}
                      onPress={() =>
                        setExpandedOccurrenceId((current) =>
                          current === occurrence.occurrenceId ? null : occurrence.occurrenceId,
                        )
                      }
                      tone="secondary"
                    />

                    {isExpanded ? (
                      occurrence.participants?.length ? (
                        <View style={styles.attendeeList}>
                          {occurrence.participants.map((participant, index) => (
                            <View key={participant.participantId} style={styles.attendeeRow}>
                              <Text style={styles.attendeeName}>{getParticipantLabel(participant, index)}</Text>
                              <Text style={styles.attendeeMeta}>{getParticipantMeta(participant)}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.helperText}>
                          No attendee records have been created for this session yet.
                        </Text>
                      )
                    ) : null}
                  </View>
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

      <AdminModal
        footer={
          <View style={styles.modalFooter}>
            <AccountPrimaryButton label="Close" onPress={() => setEditingOccurrence(null)} tone="secondary" />
            <AccountPrimaryButton
              label="Save session"
              loading={savingEdit}
              loadingLabel="Saving..."
              onPress={() => {
                void saveEdit();
              }}
            />
          </View>
        }
        onClose={() => setEditingOccurrence(null)}
        title="Edit session"
        visible={Boolean(editingOccurrence)}
      >
        {editingOccurrence ? (
          <>
            <Text style={styles.modalLead}>{editingOccurrence.label}</Text>
            <Text style={styles.helperText}>Timezone: {editingOccurrence.timezone}</Text>
            {formError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{formError}</Text> : null}
            <DatePickerField
              label="Start date"
              onChangeDate={(value) =>
                setEditingOccurrence((current) => (current ? { ...current, startDate: value } : current))
              }
              value={editingOccurrence.startDate}
            />
            <AccountTextField
              autoCapitalize="none"
              keyboardType="default"
              label="Start time"
              onChangeText={(value) =>
                setEditingOccurrence((current) => (current ? { ...current, startTime: value } : current))
              }
              placeholder="19:30"
              value={editingOccurrence.startTime}
            />
            <DatePickerField
              allowClear
              label="End date"
              onChangeDate={(value) =>
                setEditingOccurrence((current) => (current ? { ...current, endDate: value } : current))
              }
              value={editingOccurrence.endDate}
            />
            <AccountTextField
              autoCapitalize="none"
              keyboardType="default"
              label="End time"
              onChangeText={(value) =>
                setEditingOccurrence((current) => (current ? { ...current, endTime: value } : current))
              }
              placeholder="21:00"
              value={editingOccurrence.endTime}
            />
            <Text style={styles.helperText}>
              Leave both end fields blank if the session should not have an explicit end time.
            </Text>
          </>
        ) : null}
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
  attendeeList: {
    gap: 10,
  },
  attendeeMeta: {
    ...typography.bodyRegular,
    fontSize: 12,
  },
  attendeeName: {
    ...typography.bodySemiBold,
    fontSize: 14,
  },
  attendeeRow: {
    gap: 2,
  },
  attendeeSection: {
    gap: 12,
  },
  errorText: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: 13,
  },
  list: {
    gap: 14,
  },
  modalFooter: {
    gap: 12,
  },
  modalLead: {
    ...typography.bodyBold,
    fontSize: 18,
  },
  section: {
    gap: 10,
  },
});
