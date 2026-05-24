import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ParticipantStatus } from '@data/graphql/types/graphql';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { RemoteImage } from '@/components/core/RemoteImage';
import { EventDetailActionButton } from '@/components/events/detail/EventDetailActionButton';
import { EventRsvpSheet } from '@/components/events/detail/EventRsvpSheet';
import { EventDetailSection } from '@/components/events/detail/EventDetailSection';
import { EventDetailStat } from '@/components/events/detail/EventDetailStat';
import { useEventDetailActions } from '@/hooks/events/useEventDetailActions';
import { useEventMoments } from '@/hooks/moments/useEventMoments';
import { EventMomentsRing } from '@/components/moments/EventMomentsRing';
import { MomentComposerModal } from '@/components/moments/MomentComposerModal';
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
import { addEventToCalendar, openEventLocationInMaps, shareEvent } from '@/lib/events/deviceActions';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type EventDetailsRoute = RouteProp<RootStackParamList, 'EventDetails'>;

export function EventDetailsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<EventDetailsRoute>();
  const { authToken, isAuthenticated } = useAppShell();
  const { theme } = useAppTheme();
  const occurrence = route.params.occurrence;
  const imageUrl = getEventImageUrl(occurrence);
  const title = getEventTitle(occurrence);
  const participantCount = getOccurrenceParticipantCount(occurrence) || occurrence.rsvpCount || 0;
  const participants = getOccurrenceParticipantPreview(occurrence, 6);
  const hostUser = occurrence.eventSeries?.organizers?.[0]?.user;
  const hostOrganization = occurrence.eventSeries?.organization;
  const hostLabel = occurrence.eventSeries?.organization?.name ?? getDisplayName(hostUser);
  const categories = occurrence.eventSeries?.eventCategories ?? [];
  const eventId = occurrence.eventSeries?.eventId;
  const description =
    occurrence.eventSeries?.description?.trim() ||
    occurrence.eventSeries?.summary?.trim() ||
    'Event details will appear here once the organizer adds a full description.';
  const { cancelRsvp, goingToEvent, interestedInEvent, isSaved, loading, rsvpStatus, toggleSave } =
    useEventDetailActions(occurrence, authToken);
  const { error: momentsError, moments, refetch: refetchMoments } = useEventMoments(eventId, authToken);
  const [rsvpSheetVisible, setRsvpSheetVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [localParticipantCount, setLocalParticipantCount] = useState(participantCount);

  useEffect(() => {
    setLocalParticipantCount(participantCount);
  }, [participantCount]);

  const rsvpLabel = !isAuthenticated
    ? 'Login to RSVP'
    : rsvpStatus === 'Going'
      ? 'Going'
      : rsvpStatus === 'Interested'
        ? 'Interested'
        : 'RSVP';
  const rsvpTone = !isAuthenticated || !rsvpStatus ? 'primary' : 'successSoft';
  const saveTone = isSaved ? 'primarySoft' : 'secondary';
  const rsvpIcon = rsvpStatus === 'Interested' ? 'star' : 'check-square';
  const attendeeLabel = useMemo(() => formatCountLabel(localParticipantCount, 'guest'), [localParticipantCount]);
  const heroPillLabel = useMemo(() => formatCountLabel(localParticipantCount, 'going'), [localParticipantCount]);
  const heroFallback = (
    <LinearGradient colors={theme.colors.heroGradient} style={styles.heroPlaceholder}>
      <Text style={[styles.heroPlaceholderText, { color: theme.colors.heroText }]}>
        {title.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
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

  const handleOpenHostProfile = () => {
    if (hostOrganization?.orgId) {
      navigation.navigate('OrganizationDetails', {
        orgId: hostOrganization.orgId,
        orgName: hostOrganization.name,
      });
      return;
    }

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

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: theme.colors.background }}
      >
        <View style={styles.heroFrame}>
          <RemoteImage fallback={heroFallback} showLoader uri={imageUrl} style={styles.heroImage} />

          <LinearGradient
            colors={['rgba(15, 23, 42, 0.04)', 'rgba(15, 23, 42, 0.2)', 'rgba(15, 23, 42, 0.86)']}
            style={styles.heroGradient}
          />

          <View style={styles.heroTopRow}>
            <View
              style={[styles.heroPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.heroPillText, { color: theme.colors.primary }]}>{heroPillLabel}</Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: theme.colors.heroText }]}>{title}</Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.heroText }]}>{hostLabel}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <EventDetailActionButton
            icon={rsvpIcon}
            disabled={loading}
            label={rsvpLabel}
            onPress={handleRsvpPress}
            tone={rsvpTone}
          />
          <EventDetailActionButton
            disabled={loading}
            icon="bookmark"
            label={isSaved ? 'Saved' : 'Save'}
            onPress={handleToggleSave}
            tone={saveTone}
          />
          <EventDetailActionButton icon="share-2" label="Share" onPress={handleShare} tone="secondary" />
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
          <Pressable
            onPress={handleOpenHostProfile}
            style={({ pressed }) => [
              styles.hostCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <ProfileAvatar
              imageUrl={occurrence.eventSeries?.organization?.logo ?? hostUser?.profile_picture}
              label={hostLabel}
              size={48}
            />
            <View style={styles.hostTextBlock}>
              <Text style={[styles.hostTitle, { color: theme.colors.textPrimary }]}>{hostLabel}</Text>
              <Text style={[styles.hostSubtitle, { color: theme.colors.textSecondary }]}>
                {occurrence.eventSeries?.organization ? 'Organizer' : 'Event host'}
              </Text>
            </View>
          </Pressable>
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
    gap: 10,
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
  heroContent: {
    bottom: 20,
    gap: 6,
    left: 18,
    position: 'absolute',
    right: 18,
  },
  heroFrame: {
    borderRadius: 28,
    height: 320,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroPillText: {
    ...typography.bodyBold,
    fontSize: 12,
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
    opacity: 0.92,
  },
  heroTitle: {
    ...typography.displayBold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  heroTopRow: {
    left: 18,
    position: 'absolute',
    top: 18,
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
  pageContent: {
    gap: 22,
    paddingBottom: 108,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
