import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { DimensionValue } from 'react-native';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileEventOccurrence, MobileParticipant } from '@data/graphql/query/Discovery/types';
import { ParticipantStatus } from '@data/graphql/types/graphql';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { navigationRef } from '@/app/navigation/navigationRef';
import { EventCardActionButton } from '@/components/events/card/EventCardActionButton';
import { EventRsvpSheet } from '@/components/events/detail/EventRsvpSheet';
import { useEventCardActions } from '@/hooks/events/useEventCardActions';
import {
  formatCountLabel,
  formatEventScheduleRange,
  formatLocationLabel,
  getDisplayName,
  getEventCityLabel,
  getEventImageUrl,
  getEventStatusLabel,
  getEventTitle,
  getInitials,
  getOccurrenceParticipantPreview,
  getParticipantKey,
} from '@/lib/events/formatters';
import { shareEvent } from '@/lib/events/deviceActions';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type EventCardProps = {
  cardWidth?: DimensionValue;
  occurrence: MobileEventOccurrence;
  onPress?: () => void;
  variant?: 'featured' | 'feed';
};

function ParticipantBubble({ participant, index }: { participant: MobileParticipant; index: number }) {
  const { theme } = useAppTheme();
  const label = getDisplayName(participant.user);
  const avatarUrl = participant.user?.profile_picture;

  return (
    <View
      style={[
        styles.participantWrap,
        {
          backgroundColor: theme.colors.surface,
          marginLeft: index === 0 ? 0 : -8,
        },
      ]}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.participantImage} />
      ) : (
        <View style={[styles.participantFallback, { backgroundColor: theme.colors.surfaceRaised }]}>
          <Text style={[styles.participantFallbackText, { color: theme.colors.textPrimary }]}>
            {getInitials(label)}
          </Text>
        </View>
      )}
    </View>
  );
}

export function EventCard({ cardWidth = '100%', occurrence, onPress, variant = 'feed' }: EventCardProps) {
  const { theme } = useAppTheme();
  const { authToken, isAuthenticated } = useAppShell();
  const imageUrl = getEventImageUrl(occurrence);
  const { cancelRsvp, goingToEvent, interestedInEvent, isSaved, loading, participantCount, rsvpStatus, toggleSave } =
    useEventCardActions(occurrence, authToken);
  const [rsvpSheetVisible, setRsvpSheetVisible] = useState(false);
  const participants = getOccurrenceParticipantPreview(occurrence);
  const isFeatured = variant === 'featured';
  const overlayLabel = isFeatured ? getEventCityLabel(occurrence).toUpperCase() : getEventStatusLabel(occurrence);
  const shadowStyle =
    theme.mode === 'light'
      ? {
          elevation: 4,
          shadowColor: theme.colors.heroBackground,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }
      : null;

  const promptLoginIfNeeded = () => {
    if (isAuthenticated) {
      return false;
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate('Login', { redirectTab: 'Events' });
    }

    return true;
  };

  const handleRsvpPress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();

    if (promptLoginIfNeeded()) {
      return;
    }

    setRsvpSheetVisible(true);
  };

  const handleToggleSave = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();

    if (promptLoginIfNeeded()) {
      return;
    }

    void toggleSave().catch((error: unknown) => {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'We could not update the saved state.');
    });
  };

  const handleShare = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();

    void shareEvent(occurrence).catch((error: unknown) => {
      Alert.alert('Share failed', error instanceof Error ? error.message : 'We could not open the share sheet.');
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          shadowStyle,
          {
            backgroundColor: theme.colors.surface,
            borderWidth: 0,
            opacity: pressed ? 0.94 : 1,
            width: cardWidth,
          },
        ]}
      >
        <View style={[styles.imageShell, isFeatured ? styles.imageFeatured : styles.imageFeed]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <LinearGradient colors={theme.colors.heroGradient} style={styles.imagePlaceholder}>
              <Text style={[styles.imagePlaceholderText, { color: theme.colors.heroText }]}>
                {getEventTitle(occurrence).charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          <View style={[styles.imageOverlay, { backgroundColor: theme.colors.heroBackground + '24' }]} />
          <View
            style={[
              styles.overlayPill,
              isFeatured
                ? { backgroundColor: theme.colors.surface, borderWidth: 0 }
                : { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primarySoft },
            ]}
          >
            <Text
              style={[
                styles.overlayPillText,
                {
                  color: isFeatured ? theme.colors.primary : theme.colors.textPrimary,
                },
              ]}
            >
              {overlayLabel}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {!isFeatured ? (
            <View style={[styles.attendancePill, { borderColor: theme.colors.border }]}>
              <Feather color={theme.colors.textSecondary} name="users" size={14} />
              <Text style={[styles.attendancePillText, { color: theme.colors.textPrimary }]}>
                {formatCountLabel(participantCount, 'going')}
              </Text>
            </View>
          ) : null}

          <Text numberOfLines={2} style={[styles.title, { color: theme.colors.textPrimary }]}>
            {getEventTitle(occurrence)}
          </Text>

          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <Feather color={theme.colors.textSecondary} name="calendar" size={17} />
              <Text numberOfLines={2} style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {formatEventScheduleRange(occurrence)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Feather color={theme.colors.textSecondary} name="map-pin" size={17} />
              <Text numberOfLines={1} style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {formatLocationLabel(occurrence)}
              </Text>
            </View>
            {isFeatured ? (
              <View style={styles.metaRow}>
                <Feather color={theme.colors.textSecondary} name="check-square" size={17} />
                <Text numberOfLines={1} style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {formatCountLabel(participantCount, 'going')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={isFeatured ? styles.featuredFooter : styles.feedFooter}>
            {isFeatured ? null : (
              <View style={styles.participantsRow}>
                <View style={styles.participantsStack}>
                  {participants.map((participant, index) => (
                    <ParticipantBubble index={index} key={getParticipantKey(participant)} participant={participant} />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.actionsRow}>
              <EventCardActionButton
                active={!!rsvpStatus}
                disabled={loading}
                icon={rsvpStatus === ParticipantStatus.Interested ? 'star' : 'check-square'}
                onPress={handleRsvpPress}
                tone="success"
              />
              <EventCardActionButton
                active={isSaved}
                disabled={loading}
                icon="bookmark"
                onPress={handleToggleSave}
                tone="primary"
              />
              <EventCardActionButton icon="share-2" onPress={handleShare} tone="neutral" />
            </View>
          </View>
        </View>
      </Pressable>
      <EventRsvpSheet
        currentStatus={rsvpStatus}
        loading={loading}
        onCancelRsvp={() => {
          void cancelRsvp()
            .then(() => {
              setRsvpSheetVisible(false);
            })
            .catch((error: unknown) => {
              Alert.alert('RSVP failed', error instanceof Error ? error.message : 'We could not update your RSVP.');
            });
        }}
        onClose={() => setRsvpSheetVisible(false)}
        onSelectStatus={(status) => {
          const action = status === ParticipantStatus.Going ? goingToEvent : interestedInEvent;

          void action()
            .then(() => {
              setRsvpSheetVisible(false);
            })
            .catch((error: unknown) => {
              Alert.alert('RSVP failed', error instanceof Error ? error.message : 'We could not update your RSVP.');
            });
        }}
        visible={rsvpSheetVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  attendancePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  attendancePillText: {
    ...typography.bodyMedium,
    fontSize: fontSize.xs,
  },
  body: {
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featuredFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  feedFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageFeatured: {
    height: 200,
  },
  imageFeed: {
    height: 190,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
  },
  imagePlaceholder: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  imagePlaceholderText: {
    ...typography.displayBold,
    fontSize: fontSize.display,
  },
  imageShell: {
    position: 'relative',
  },
  metaList: {
    gap: 7,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  overlayPill: {
    borderRadius: 999,
    borderWidth: 1,
    left: 12,
    paddingHorizontal: 5,
    paddingVertical: 3,
    position: 'absolute',
    top: 6,
  },
  overlayPillText: {
    ...typography.bodyBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  participantFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 30,
  },
  participantFallbackText: {
    ...typography.bodyBold,
    fontSize: 10,
  },
  participantImage: {
    borderRadius: 999,
    height: 30,
    width: 30,
  },
  participantsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  participantsStack: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 30,
  },
  participantWrap: {
    borderRadius: 999,
    padding: 2,
  },
  title: {
    ...typography.displayBold,
    fontSize: 17,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
});
