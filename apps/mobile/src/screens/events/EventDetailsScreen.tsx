import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Modal, Pressable } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParticipantStatus } from '@data/graphql/types/graphql';
import { DeleteEventByIdDocument } from '@data/graphql/mutation/Event/mutation';
import { HeaderIconButton } from '@/app/navigation/HeaderIconButton';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { RemoteImage } from '@/components/core/RemoteImage';
import { EventDetailActionButton } from '@/components/events/detail/EventDetailActionButton';
import { EventImageViewerModal } from '@/components/events/detail/EventImageViewerModal';
import { EventRsvpSheet } from '@/components/events/detail/EventRsvpSheet';
import { EventDetailSection } from '@/components/events/detail/EventDetailSection';
import { EventSessionsRail } from '@/components/events/detail/EventSessionsRail';
import { EventDetailStat } from '@/components/events/detail/EventDetailStat';
import { useEventDetailActions } from '@/hooks/events/useEventDetailActions';
import { useEventMoments } from '@/hooks/moments/useEventMoments';
import { EventMomentsRing } from '@/components/moments/EventMomentsRing';
import { MomentComposerModal } from '@/components/moments/MomentComposerModal';
import { GetEventBySlugForNavigationDocument } from '@data/graphql/query/Event/query';
import {
  formatCountLabel,
  formatEventScheduleTwoLine,
  formatLocationLabel,
  getDisplayName,
  getEventImageUrl,
  getEventTitle,
  getOccurrenceParticipantCount,
  getOccurrenceParticipantPreview,
  getParticipantKey,
} from '@/lib/events/formatters';
import { mapNavigableEventOccurrences, mergeNavigableOccurrences } from '@/lib/events/adapters';
import {
  addEventToCalendar,
  openEventLocationInMaps,
  openEventSourceLink,
  shareEvent,
  shareEventSeriesLink,
  shareEventSessionLink,
} from '@/lib/events/deviceActions';
import { getApolloAuthContext } from '@/lib/auth';
import { IMPORTED_EVENT_SYSTEM_USERNAME } from '@/lib/constants/general';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type EventDetailsRoute = RouteProp<RootStackParamList, 'EventDetails'>;

type EventOptionsModalProps = {
  canEditEvent: boolean;
  hasEventSource: boolean;
  onClose: () => void;
  onDeleteEventSeries: () => void;
  onEditEventSeries: () => void;
  onEditEventSession: () => void;
  onManageEventSessions: () => void;
  onOpenEventSource: () => void;
  onShareEventSeriesLink: () => void;
  onShareEventSessionLink: () => void;
  visible: boolean;
};

function buildAttendanceBadgeLabel(goingCount: number, interestedCount: number, fallbackCount?: number) {
  if (goingCount <= 0 && interestedCount <= 0) {
    if (!fallbackCount || fallbackCount <= 0) {
      return null;
    }

    return formatCountLabel(fallbackCount, 'attendee');
  }

  const parts: string[] = [];

  if (goingCount > 0) {
    parts.push(`${goingCount} going`);
  }

  if (interestedCount > 0) {
    parts.push(`${interestedCount} interested`);
  }

  return parts.join(' · ');
}

function EventOptionsModal({
  canEditEvent,
  hasEventSource,
  onClose,
  onDeleteEventSeries,
  onEditEventSeries,
  onEditEventSession,
  onManageEventSessions,
  onOpenEventSource,
  onShareEventSeriesLink,
  onShareEventSessionLink,
  visible,
}: EventOptionsModalProps) {
  const { theme } = useAppTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable style={styles.optionsOverlay} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.optionsCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.optionsTitle, { color: theme.colors.textPrimary }]}>Event Tools</Text>

          <Pressable onPress={onShareEventSessionLink} style={styles.optionRow}>
            <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>Share Event Session Link</Text>
          </Pressable>

          <Pressable onPress={onShareEventSeriesLink} style={styles.optionRow}>
            <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>Share Event Series Link</Text>
          </Pressable>

          {hasEventSource ? (
            <Pressable onPress={onOpenEventSource} style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>Open Event Source</Text>
            </Pressable>
          ) : null}

          {canEditEvent ? (
            <Pressable onPress={onManageEventSessions} style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>Manage Event Sessions</Text>
            </Pressable>
          ) : null}

          {canEditEvent ? (
            <Pressable onPress={onEditEventSession} style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>Edit Event Session</Text>
            </Pressable>
          ) : null}

          {canEditEvent ? (
            <Pressable onPress={onEditEventSeries} style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>Edit Event Series</Text>
            </Pressable>
          ) : null}

          {canEditEvent ? (
            <Pressable onPress={onDeleteEventSeries} style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: theme.colors.error }]}>Delete Event Series</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onClose}
            style={[
              styles.optionRow,
              styles.cancelOptionRow,
              {
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.optionLabel, { color: theme.colors.primary }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function EventDetailsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<EventDetailsRoute>();
  const { authToken, isAuthenticated, userId } = useAppShell();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const routeOccurrence = route.params.occurrence;
  const occurrenceSlug = routeOccurrence.eventSeries?.slug ?? null;
  const occurrencesFromDate = useMemo(() => new Date().toISOString(), []);
  const { data: eventNavigationData } = useQuery(GetEventBySlugForNavigationDocument, {
    skip: !occurrenceSlug,
    variables: {
      slug: occurrenceSlug ?? '',
      occurrencesFromDate,
    },
    ...getApolloAuthContext(authToken),
    fetchPolicy: 'cache-and-network',
  });
  const fetchedOccurrences = useMemo(
    () =>
      eventNavigationData?.readEventBySlug ? mapNavigableEventOccurrences(eventNavigationData.readEventBySlug) : [],
    [eventNavigationData?.readEventBySlug],
  );
  const sessionOccurrences = useMemo(
    () => mergeNavigableOccurrences(routeOccurrence, fetchedOccurrences),
    [fetchedOccurrences, routeOccurrence],
  );
  const occurrence = useMemo(
    () =>
      sessionOccurrences.find((candidate) => candidate.occurrenceId === routeOccurrence.occurrenceId) ??
      routeOccurrence,
    [routeOccurrence, sessionOccurrences],
  );
  const imageUrl = getEventImageUrl(occurrence);
  const title = getEventTitle(occurrence);
  const participantCount = getOccurrenceParticipantCount(occurrence) || occurrence.rsvpCount || 0;
  const participants = getOccurrenceParticipantPreview(occurrence, 6);
  const importedOrganizerUser =
    occurrence.eventSeries?.organizers?.find((organizer) => organizer.user?.username === IMPORTED_EVENT_SYSTEM_USERNAME)
      ?.user ?? null;
  const hasImportedSystemOrganizer = Boolean(importedOrganizerUser);
  const hostOrganization = occurrence.eventSeries?.organization ?? null;
  const visibleOrganizers =
    hostOrganization && hasImportedSystemOrganizer
      ? (occurrence.eventSeries?.organizers ?? []).filter(
          (organizer) => organizer.user?.username !== IMPORTED_EVENT_SYSTEM_USERNAME,
        )
      : (occurrence.eventSeries?.organizers ?? []);
  const categories = occurrence.eventSeries?.eventCategories ?? [];
  const eventId = occurrence.eventSeries?.eventId;
  const eventSourceLink = occurrence.eventSeries?.eventLink ?? null;
  const canEditEvent = Boolean(
    userId && (occurrence.eventSeries?.organizers ?? []).some((organizer) => organizer.user?.userId === userId),
  );
  const description =
    occurrence.eventSeries?.description?.trim() ||
    occurrence.eventSeries?.summary?.trim() ||
    'Event details will appear here once the organizer adds a full description.';
  const { cancelRsvp, goingToEvent, interestedInEvent, isSaved, loading, rsvpStatus, toggleSave } =
    useEventDetailActions(occurrence, authToken);
  const [deleteEventById] = useMutation(DeleteEventByIdDocument, getApolloAuthContext(authToken));
  const { error: momentsError, moments, refetch: refetchMoments } = useEventMoments(eventId, authToken);
  const [rsvpSheetVisible, setRsvpSheetVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [eventOptionsVisible, setEventOptionsVisible] = useState(false);
  const [localParticipantCount, setLocalParticipantCount] = useState(participantCount);
  const initialGoingCount = useMemo(
    () =>
      (occurrence.participants ?? []).filter(
        (participant) =>
          participant.status === ParticipantStatus.Going || participant.status === ParticipantStatus.CheckedIn,
      ).length,
    [occurrence.participants],
  );
  const initialInterestedCount = useMemo(
    () =>
      (occurrence.participants ?? []).filter((participant) => participant.status === ParticipantStatus.Interested)
        .length,
    [occurrence.participants],
  );
  const [heroGoingCount, setHeroGoingCount] = useState(initialGoingCount);
  const [heroInterestedCount, setHeroInterestedCount] = useState(initialInterestedCount);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: ({ tintColor }) => (
        <HeaderIconButton
          accessibilityLabel="Open event options"
          icon="more-vertical"
          onPress={() => setEventOptionsVisible(true)}
          size={20}
          tintColor={tintColor}
        />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    setLocalParticipantCount(participantCount);
  }, [participantCount]);

  useEffect(() => {
    setHeroGoingCount(initialGoingCount);
    setHeroInterestedCount(initialInterestedCount);
  }, [initialGoingCount, initialInterestedCount]);

  const rsvpLabel = rsvpStatus === 'Going' ? 'Going' : rsvpStatus === 'Interested' ? 'Interested' : 'RSVP';
  const rsvpTone = !isAuthenticated || !rsvpStatus ? 'primary' : 'successSoft';
  const saveTone = isSaved ? 'primarySoft' : 'secondary';
  const rsvpIcon = rsvpStatus === 'Interested' ? 'star' : 'check-square';
  const attendeeLabel = useMemo(() => formatCountLabel(localParticipantCount, 'guest'), [localParticipantCount]);
  const heroPillLabel = useMemo(
    () => buildAttendanceBadgeLabel(heroGoingCount, heroInterestedCount, localParticipantCount),
    [heroGoingCount, heroInterestedCount, localParticipantCount],
  );
  const stickyBarBottom = Math.max(insets.bottom, 24);
  const heroFallback = (
    <View style={[styles.heroPlaceholder, { backgroundColor: theme.colors.surfaceRaised }]}>
      <Text style={[styles.heroPlaceholderText, { color: theme.colors.heroText }]}>
        {title.charAt(0).toUpperCase()}
      </Text>
    </View>
  );

  const applyParticipantCountDelta = (nextStatus: ParticipantStatus | null) => {
    setLocalParticipantCount((currentCount) => {
      if (!rsvpStatus && nextStatus) {
        return currentCount + 1;
      }

      if (rsvpStatus && !nextStatus) {
        return Math.max(0, currentCount - 1);
      }

      return currentCount;
    });
  };

  const applyAttendanceBreakdownDelta = (nextStatus: ParticipantStatus | null) => {
    const previousStatus = rsvpStatus;

    setHeroGoingCount((currentCount) => {
      let nextCount = currentCount;

      if (previousStatus === ParticipantStatus.Going || previousStatus === ParticipantStatus.CheckedIn) {
        nextCount -= 1;
      }

      if (nextStatus === ParticipantStatus.Going || nextStatus === ParticipantStatus.CheckedIn) {
        nextCount += 1;
      }

      return Math.max(0, nextCount);
    });

    setHeroInterestedCount((currentCount) => {
      let nextCount = currentCount;

      if (previousStatus === ParticipantStatus.Interested) {
        nextCount -= 1;
      }

      if (nextStatus === ParticipantStatus.Interested) {
        nextCount += 1;
      }

      return Math.max(0, nextCount);
    });
  };

  const promptLoginIfNeeded = () => {
    if (isAuthenticated) {
      return false;
    }

    navigation.navigate('Login', { redirectTab: 'Events' });
    return true;
  };

  const handleRsvpPress = () => {
    if (promptLoginIfNeeded()) {
      return;
    }

    setRsvpSheetVisible(true);
  };

  const handleSelectGoing = () => {
    void goingToEvent()
      .then((nextStatus) => {
        applyParticipantCountDelta(nextStatus);
        applyAttendanceBreakdownDelta(nextStatus);
        setRsvpSheetVisible(false);
      })
      .catch((error: unknown) => {
        Alert.alert('RSVP failed', error instanceof Error ? error.message : 'We could not update your RSVP.');
      });
  };

  const handleSelectInterested = () => {
    void interestedInEvent()
      .then((nextStatus) => {
        applyParticipantCountDelta(nextStatus);
        applyAttendanceBreakdownDelta(nextStatus);
        setRsvpSheetVisible(false);
      })
      .catch((error: unknown) => {
        Alert.alert('RSVP failed', error instanceof Error ? error.message : 'We could not update your RSVP.');
      });
  };

  const handleCancelRsvp = () => {
    void cancelRsvp()
      .then((nextStatus) => {
        applyParticipantCountDelta(nextStatus);
        applyAttendanceBreakdownDelta(nextStatus);
        setRsvpSheetVisible(false);
      })
      .catch((error: unknown) => {
        Alert.alert('RSVP failed', error instanceof Error ? error.message : 'We could not update your RSVP.');
      });
  };

  const handleToggleSave = () => {
    if (promptLoginIfNeeded()) {
      return;
    }

    void toggleSave().catch((error: unknown) => {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'We could not update the saved state.');
    });
  };

  const handleShare = () => {
    void shareEvent(occurrence).catch((error: unknown) => {
      Alert.alert('Share failed', error instanceof Error ? error.message : 'We could not open the share sheet.');
    });
  };

  const handleOpenDirections = () => {
    void openEventLocationInMaps(occurrence).catch((error: unknown) => {
      Alert.alert('Directions unavailable', error instanceof Error ? error.message : 'We could not open directions.');
    });
  };

  const handleAddToCalendar = () => {
    void addEventToCalendar(occurrence).catch((error: unknown) => {
      Alert.alert(
        'Calendar unavailable',
        error instanceof Error ? error.message : 'We could not add this event to calendar.',
      );
    });
  };

  const handleOpenEventSource = () => {
    void openEventSourceLink(eventSourceLink).catch((error: unknown) => {
      Alert.alert('Source unavailable', error instanceof Error ? error.message : 'We could not open the source link.');
    });
  };

  const navigateToOrganizerSessions = (initialAction: 'edit' | 'view') => {
    setEventOptionsVisible(false);

    if (!eventId) {
      Alert.alert('Sessions unavailable', 'We could not find the event details needed to manage this event.');
      return;
    }

    navigation.navigate('OrganizerEventSessions', {
      eventId,
      initialAction,
      initialOccurrenceId: occurrence.occurrenceId,
      title: occurrence.eventSeries?.title ?? title,
    });
  };

  const handleEditEventSeries = () => {
    setEventOptionsVisible(false);

    if (!eventId) {
      Alert.alert('Edit unavailable', 'We could not find the event details needed to edit this event series.');
      return;
    }

    navigation.navigate('EditEvent', { eventId });
  };

  const handleDeleteEventSeries = () => {
    setEventOptionsVisible(false);

    if (!eventId) {
      Alert.alert('Delete unavailable', 'We could not find the event details needed to delete this event series.');
      return;
    }

    Alert.alert(
      'Delete Event Series',
      'This series and all of its generated sessions will be permanently removed. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete series',
          style: 'destructive',
          onPress: () => {
            void withBlockingLoader('Deleting event series…', async () => {
              try {
                await deleteEventById({ variables: { eventId } });
                showToast({ message: 'Event series deleted successfully.', tone: 'success' });
                navigation.navigate('MainTabs', { screen: 'Events' });
              } catch (error) {
                showToast({
                  message: error instanceof Error ? error.message : 'We could not delete this event.',
                  tone: 'error',
                });
              }
            });
          },
        },
      ],
    );
  };

  const handleShareEventSeriesLink = () => {
    setEventOptionsVisible(false);

    void shareEventSeriesLink(occurrence).catch((error: unknown) => {
      Alert.alert(
        'Share failed',
        error instanceof Error ? error.message : 'We could not open the share sheet for this event series.',
      );
    });
  };

  const handleShareEventSessionLink = () => {
    setEventOptionsVisible(false);

    void shareEventSessionLink(occurrence).catch((error: unknown) => {
      Alert.alert(
        'Share failed',
        error instanceof Error ? error.message : 'We could not open the share sheet for this event session.',
      );
    });
  };

  const handleMessageGatherle = () => {
    if (promptLoginIfNeeded()) {
      return;
    }

    if (!importedOrganizerUser?.userId) {
      Alert.alert('Messaging unavailable', 'We could not find the Gatherle account for this imported event.');
      return;
    }

    navigation.navigate('MessageThread', {
      avatarUrl: importedOrganizerUser.profile_picture,
      displayName: getDisplayName(importedOrganizerUser),
      username: importedOrganizerUser.username,
      withUserId: importedOrganizerUser.userId,
    });
  };

  const handleOpenOrganizationProfile = () => {
    if (hostOrganization?.orgId) {
      navigation.navigate('OrganizationDetails', {
        orgId: hostOrganization.orgId,
        orgName: hostOrganization.name,
      });
    }
  };

  const handleOpenHostProfile = (hostUser?: (typeof visibleOrganizers)[number]['user'] | null) => {
    if (hostUser?.userId) {
      navigation.navigate('UserProfile', {
        avatarUrl: hostUser.profile_picture,
        displayName: getDisplayName(hostUser),
        userId: hostUser.userId,
        username: hostUser.username,
      });
    }
  };

  const handleOpenMomentComposer = () => {
    if (promptLoginIfNeeded()) {
      return;
    }

    if (!eventId) {
      Alert.alert('Moments unavailable', 'We could not find the event details needed to post a moment.');
      return;
    }

    setComposerVisible(true);
  };

  const handleSelectOccurrence = (nextOccurrence: typeof occurrence) => {
    if (nextOccurrence.occurrenceId === occurrence.occurrenceId) {
      return;
    }

    navigation.setParams({ occurrence: nextOccurrence });
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.pageContent,
          {
            paddingBottom: stickyBarBottom + 74,
          },
        ]}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: theme.colors.background }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setImageViewerVisible(true)}
          style={[
            styles.heroFrame,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <RemoteImage fallback={heroFallback} resizeMode="cover" showLoader style={styles.heroImage} uri={imageUrl} />

          {heroPillLabel ? (
            <View style={styles.heroPillWrap}>
              <View
                style={[
                  styles.heroPill,
                  {
                    backgroundColor: 'rgba(8, 17, 32, 0.72)',
                    borderColor: 'rgba(255, 255, 255, 0.18)',
                  },
                ]}
              >
                <Text style={styles.heroPillText}>{heroPillLabel}</Text>
              </View>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.heroSummary}>
          <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
        </View>

        <View style={styles.actionsRow}>
          <EventDetailActionButton icon="map" label="Directions" onPress={handleOpenDirections} tone="secondary" />
          <EventDetailActionButton
            icon="calendar"
            label="Add to calendar"
            onPress={handleAddToCalendar}
            tone="secondary"
          />
        </View>

        {eventSourceLink ? (
          <View style={styles.actionsRow}>
            <EventDetailActionButton
              icon="external-link"
              label="View event source"
              onPress={handleOpenEventSource}
              tone="secondary"
            />
          </View>
        ) : null}

        {hasImportedSystemOrganizer ? (
          <View style={styles.actionsRow}>
            <EventDetailActionButton
              icon="message-circle"
              label="Message Gatherle"
              onPress={handleMessageGatherle}
              tone="secondary"
            />
          </View>
        ) : null}

        {sessionOccurrences.length > 1 ? (
          <EventDetailSection title="All Sessions">
            <EventSessionsRail
              occurrences={sessionOccurrences}
              onSelectOccurrence={handleSelectOccurrence}
              selectedOccurrenceId={occurrence.occurrenceId}
            />
          </EventDetailSection>
        ) : null}

        {eventId ? (
          <EventDetailSection title="Moments">
            <EventMomentsRing
              moments={moments}
              myRsvpStatus={rsvpStatus ?? null}
              onPressAddMoment={handleOpenMomentComposer}
            />
            {momentsError ? (
              <Text style={[styles.momentsErrorText, { color: theme.colors.textMuted }]}>
                We could not load event moments right now.
              </Text>
            ) : null}
          </EventDetailSection>
        ) : null}

        <View style={styles.statGrid}>
          <EventDetailStat icon="calendar" label="Schedule" value={formatEventScheduleTwoLine(occurrence)} />
          <EventDetailStat
            icon="map-pin"
            label="Location"
            onPress={handleOpenDirections}
            value={formatLocationLabel(occurrence)}
          />
          <EventDetailStat icon="users" label="Attendance" value={attendeeLabel} />
        </View>

        <EventDetailSection title="About this event">
          <Text style={[styles.bodyCopy, { color: theme.colors.textSecondary }]}>{description}</Text>
        </EventDetailSection>

        {categories.length > 0 ? (
          <EventDetailSection title="Categories">
            <View style={styles.chipRow}>
              {categories.map((category) => (
                <View
                  key={category.eventCategoryId}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.categoryChipText, { color: theme.colors.textPrimary }]}>{category.name}</Text>
                </View>
              ))}
            </View>
          </EventDetailSection>
        ) : null}

        <EventDetailSection title="Hosted by">
          {hostOrganization || visibleOrganizers.length > 0 ? (
            <View style={styles.hostList}>
              {hostOrganization ? (
                <Pressable
                  onPress={handleOpenOrganizationProfile}
                  style={({ pressed }) => [
                    styles.hostCard,
                    {
                      backgroundColor: theme.colors.surfaceRaised,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <ProfileAvatar imageUrl={hostOrganization.logo} label={hostOrganization.name} size={48} />
                  <View style={styles.hostTextBlock}>
                    <Text style={[styles.hostTitle, { color: theme.colors.textPrimary }]}>{hostOrganization.name}</Text>
                    <Text style={[styles.hostSubtitle, { color: theme.colors.textSecondary }]}>Organization</Text>
                  </View>
                </Pressable>
              ) : null}

              {visibleOrganizers
                .filter((organizer) => organizer.user)
                .map((organizer) => {
                  const hostUser = organizer.user;
                  const hostLabel = getDisplayName(hostUser);

                  return (
                    <Pressable
                      key={hostUser?.userId ?? `${hostLabel}:${organizer.role ?? 'host'}`}
                      onPress={() => handleOpenHostProfile(hostUser)}
                      style={({ pressed }) => [
                        styles.hostCard,
                        {
                          backgroundColor: theme.colors.surfaceRaised,
                          borderColor: theme.colors.border,
                          opacity: pressed ? 0.92 : 1,
                        },
                      ]}
                    >
                      <ProfileAvatar imageUrl={hostUser?.profile_picture} label={hostLabel} size={48} />
                      <View style={styles.hostTextBlock}>
                        <Text style={[styles.hostTitle, { color: theme.colors.textPrimary }]}>{hostLabel}</Text>
                        <Text style={[styles.hostSubtitle, { color: theme.colors.textSecondary }]}>
                          {organizer.role || 'Event host'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          ) : (
            <Text style={[styles.hostSubtitle, { color: theme.colors.textSecondary }]}>No organizers listed.</Text>
          )}
        </EventDetailSection>

        {participants.length > 0 ? (
          <EventDetailSection title="People going">
            <View style={styles.attendeesRow}>
              {participants.map((participant, index) => (
                <Pressable
                  key={getParticipantKey(participant)}
                  onPress={() => {
                    if (!participant.user?.userId) {
                      return;
                    }

                    navigation.navigate('UserProfile', {
                      avatarUrl: participant.user.profile_picture,
                      displayName: getDisplayName(participant.user),
                      userId: participant.user.userId,
                      username: participant.user.username,
                    });
                  }}
                  style={[styles.attendeeWrap, { marginLeft: index === 0 ? 0 : -10 }]}
                >
                  <ProfileAvatar
                    imageUrl={participant.user?.profile_picture}
                    label={getDisplayName(participant.user)}
                    size={40}
                  />
                </Pressable>
              ))}
              <Text style={[styles.attendeeSummary, { color: theme.colors.textSecondary }]}>
                {formatCountLabel(participantCount, 'person')}
              </Text>
            </View>
          </EventDetailSection>
        ) : null}

        <EventRsvpSheet
          currentStatus={rsvpStatus}
          loading={loading}
          onCancelRsvp={handleCancelRsvp}
          onClose={() => setRsvpSheetVisible(false)}
          onSelectStatus={(status) => {
            if (status === ParticipantStatus.Going) {
              handleSelectGoing();
              return;
            }

            handleSelectInterested();
          }}
          visible={rsvpSheetVisible}
        />
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[
          styles.bottomBarWrap,
          {
            bottom: stickyBarBottom,
          },
        ]}
      >
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <EventDetailActionButton
            compact
            disabled={loading}
            icon={rsvpIcon}
            label={rsvpLabel}
            onPress={handleRsvpPress}
            tone={rsvpTone}
          />
          <EventDetailActionButton
            compact
            disabled={loading}
            icon="bookmark"
            label={isSaved ? 'Saved' : 'Save'}
            onPress={handleToggleSave}
            tone={saveTone}
          />
          <EventDetailActionButton compact icon="share-2" label="Share" onPress={handleShare} tone="secondary" />
        </View>
      </View>

      <EventOptionsModal
        canEditEvent={canEditEvent}
        hasEventSource={Boolean(eventSourceLink)}
        onClose={() => setEventOptionsVisible(false)}
        onDeleteEventSeries={handleDeleteEventSeries}
        onEditEventSeries={handleEditEventSeries}
        onEditEventSession={() => navigateToOrganizerSessions('edit')}
        onManageEventSessions={() => navigateToOrganizerSessions('view')}
        onOpenEventSource={() => {
          setEventOptionsVisible(false);
          handleOpenEventSource();
        }}
        onShareEventSeriesLink={handleShareEventSeriesLink}
        onShareEventSessionLink={handleShareEventSessionLink}
        visible={eventOptionsVisible}
      />

      <EventImageViewerModal
        imageUrl={imageUrl}
        onClose={() => setImageViewerVisible(false)}
        title={title}
        visible={imageViewerVisible}
      />

      {eventId ? (
        <MomentComposerModal
          authToken={authToken}
          eventId={eventId}
          occurrenceId={occurrence.occurrenceId}
          onClose={() => setComposerVisible(false)}
          onCreated={() => {
            void refetchMoments();
          }}
          open={composerVisible}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bottomBar: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
  },
  bottomBarWrap: {
    left: 20,
    position: 'absolute',
    right: 20,
  },
  attendeeSummary: {
    ...typography.bodyMedium,
    fontSize: 14,
    marginLeft: 12,
  },
  attendeeWrap: {
    position: 'relative',
  },
  attendeesRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  bodyCopy: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 24,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipText: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroFrame: {
    aspectRatio: 16 / 9,
    borderColor: 'transparent',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  heroPillText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: -0.2,
  },
  heroPillWrap: {
    bottom: 14,
    left: 14,
    position: 'absolute',
  },
  heroPlaceholder: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  heroPlaceholderText: {
    ...typography.displayBold,
    fontSize: 48,
  },
  heroSubtitle: {
    ...typography.bodyMedium,
    fontSize: 14,
  },
  heroSummary: {
    gap: 10,
  },
  heroTitle: {
    ...typography.displayBold,
    fontSize: 18,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  hostCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  hostList: {
    gap: 12,
  },
  hostSubtitle: {
    ...typography.bodyRegular,
    fontSize: 13,
  },
  hostTextBlock: {
    flex: 1,
    gap: 2,
  },
  hostTitle: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  momentsErrorText: {
    ...typography.bodyRegular,
    fontSize: 13,
    marginTop: 10,
  },
  cancelOptionRow: {
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 14,
  },
  optionLabel: {
    ...typography.bodyMedium,
    fontSize: 15,
  },
  optionRow: {
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  optionsCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 4,
    maxWidth: 320,
    paddingHorizontal: 18,
    paddingVertical: 18,
    width: '100%',
  },
  optionsOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 17, 32, 0.42)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  optionsTitle: {
    ...typography.displayBold,
    fontSize: 18,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  pageContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
