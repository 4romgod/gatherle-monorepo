import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { DimensionValue } from 'react-native';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileEventOccurrence, MobileParticipant } from '@data/graphql/query/Discovery/types';
import { ParticipantStatus } from '@data/graphql/types/graphql';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { navigationRef } from '@/app/navigation/navigationRef';
import { RemoteImage } from '@/components/core/RemoteImage';
import { EventCardActionButton } from '@/components/events/card/EventCardActionButton';
import { EventRsvpSheet } from '@/components/events/detail/EventRsvpSheet';
import { useFollowingUserIds } from '@/hooks/follow/useFollowingUserIds';
import { useEventCardActions } from '@/hooks/events/useEventCardActions';
import {
  buildEventCardSocialProof,
  formatEventScheduleRange,
  formatLocationLabel,
  getDisplayName,
  getEventCityLabel,
  getEventImageUrl,
  getEventStatusLabel,
  getEventTitle,
  getInitials,
  getParticipantKey,
} from '@/lib/events/formatters';
import { shareEvent } from '@/lib/events/deviceActions';
import { isUpcomingEventTime } from '@/lib/events/eventCollections';
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
  const fallback = (
    <View style={[styles.participantFallback, { backgroundColor: theme.colors.surfaceRaised }]}>
      <Text style={[styles.participantFallbackText, { color: theme.colors.textPrimary }]}>{getInitials(label)}</Text>
    </View>
  );

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
      <RemoteImage fallback={fallback} uri={avatarUrl} style={styles.participantImage} />
    </View>
  );
}

function EventCardPrimaryAction({
  disabled,
  icon,
  label,
  loading,
  onPress,
  status,
}: {
  disabled: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  loading: boolean;
  onPress: (event: { stopPropagation?: () => void }) => void;
  status: ParticipantStatus | null;
}) {
  const { theme } = useAppTheme();
  const palette = disabled
    ? {
        backgroundColor: theme.colors.surfaceMuted,
        borderColor: theme.colors.border,
        textColor: theme.colors.textSecondary,
      }
    : status === ParticipantStatus.Going
      ? {
          backgroundColor: theme.colors.successSoft,
          borderColor: theme.colors.success,
          textColor: theme.colors.success,
        }
      : status === ParticipantStatus.Interested
        ? {
            backgroundColor: theme.colors.primarySoft,
            borderColor: theme.colors.primary,
            textColor: theme.colors.primary,
          }
        : {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
            textColor: theme.colors.heroText,
          };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryActionButton,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: disabled || loading ? 0.72 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} size="small" />
      ) : (
        <>
          <Feather color={palette.textColor} name={icon} size={16} />
          <Text numberOfLines={1} style={[styles.primaryActionText, { color: palette.textColor }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function EventCard({ cardWidth = '100%', occurrence, onPress, variant = 'feed' }: EventCardProps) {
  const { theme } = useAppTheme();
  const { authToken, isAuthenticated } = useAppShell();
  const followingUserIds = useFollowingUserIds(authToken);
  const imageUrl = getEventImageUrl(occurrence);
  const {
    cancelRsvp,
    goingCount,
    goingToEvent,
    interestedCount,
    interestedInEvent,
    isSaved,
    participantCount,
    rsvpLoading,
    rsvpStatus,
    saveLoading,
    toggleSave,
  } = useEventCardActions(occurrence, authToken);
  const [rsvpSheetVisible, setRsvpSheetVisible] = useState(false);
  const isFeatured = variant === 'featured';
  const rsvpClosed = !isUpcomingEventTime(occurrence.startAt, occurrence.endAt);
  const overlayLabel = isFeatured ? getEventCityLabel(occurrence).toUpperCase() : getEventStatusLabel(occurrence);
  const socialProof = buildEventCardSocialProof(occurrence, {
    counts: {
      goingCount,
      interestedCount,
      totalCount: participantCount,
    },
    followingUserIds,
  });
  const rsvpActionLabel = rsvpClosed
    ? 'Event ended'
    : rsvpStatus === ParticipantStatus.Going
      ? 'Going'
      : rsvpStatus === ParticipantStatus.Interested
        ? 'Interested'
        : 'RSVP';
  const rsvpActionIcon = rsvpStatus === ParticipantStatus.Interested ? 'star' : 'check-square';
  const imageFallback = (
    <LinearGradient colors={theme.colors.heroGradient} style={styles.imagePlaceholder}>
      <Text style={[styles.imagePlaceholderText, { color: theme.colors.heroText }]}>
        {getEventTitle(occurrence).charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
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

    if (rsvpClosed) {
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
          <RemoteImage
            fallback={imageFallback}
            resizeMode="cover"
            showLoader
            style={[styles.image, { backgroundColor: theme.colors.surfaceRaised }]}
            uri={imageUrl}
          />
          <View
            style={[
              styles.overlayPill,
              styles.imageOverlayPill,
              isFeatured
                ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
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
          <Text numberOfLines={2} style={[styles.title, { color: theme.colors.textPrimary }]}>
            {getEventTitle(occurrence)}
          </Text>

          <View style={styles.socialProofRow}>
            {socialProof.avatars.length > 0 ? (
              <View style={styles.participantsStack}>
                {socialProof.avatars.map((participant, index) => (
                  <ParticipantBubble index={index} key={getParticipantKey(participant)} participant={participant} />
                ))}
              </View>
            ) : null}
            <Text numberOfLines={1} style={[styles.socialProofText, { color: theme.colors.textSecondary }]}>
              {socialProof.text}
            </Text>
          </View>

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
          </View>

          <View style={styles.actionsRow}>
            <EventCardPrimaryAction
              disabled={rsvpClosed}
              icon={rsvpActionIcon}
              label={rsvpActionLabel}
              loading={rsvpLoading}
              onPress={handleRsvpPress}
              status={rsvpStatus}
            />
            <EventCardActionButton
              active={isSaved}
              loading={saveLoading}
              icon="bookmark"
              onPress={handleToggleSave}
              tone="primary"
            />
            <EventCardActionButton icon="share-2" onPress={handleShare} tone="neutral" />
          </View>
        </View>
      </Pressable>
      <EventRsvpSheet
        currentStatus={rsvpStatus}
        loading={rsvpLoading}
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
    paddingTop: 2,
  },
  body: {
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageFeatured: {
    aspectRatio: 16 / 9,
  },
  imageFeed: {
    aspectRatio: 16 / 9,
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
  imageOverlayPill: {
    left: 12,
    position: 'absolute',
    top: 12,
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
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  participantsStack: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 30,
  },
  participantWrap: {
    borderRadius: 999,
    padding: 2,
  },
  primaryActionButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryActionText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  socialProofRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 30,
  },
  socialProofText: {
    ...typography.bodyMedium,
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  title: {
    ...typography.displayBold,
    fontSize: 17,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
});
